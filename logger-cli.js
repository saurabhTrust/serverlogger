#!/usr/bin/env node

const axios = require('axios');
const chalk = require('chalk').default || require('chalk');
const Table = require('cli-table3');
const WebSocket = require('ws');
const readline = require('readline');

const BASE_URL = process.env.LOGGER_URL || 'http://localhost:3000';
const WS_URL = process.env.LOGGER_WS || 'ws://localhost:3000';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color mapping for log levels
const logLevelColors = {
  'ERROR': chalk.red,
  'WARN': chalk.yellow,
  'INFO': chalk.blue,
  'DEBUG': chalk.gray,
  'VERBOSE': chalk.gray
};

// Format timestamp
function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
}

// Format device status
function formatStatus(status) {
  if (status === 'online') {
    return chalk.green('● ONLINE');
  } else {
    return chalk.red('● OFFLINE');
  }
}

// List all devices
async function listDevices() {
  try {
    const response = await axios.get(`${BASE_URL}/api/devices`);
    const devices = response.data;
    
    if (devices.length === 0) {
      console.log(chalk.yellow('No devices connected yet'));
      return;
    }
    
    const table = new Table({
      head: [
        chalk.cyan('Device ID'),
        chalk.cyan('Name'),
        chalk.cyan('OS'),
        chalk.cyan('Status'),
        chalk.cyan('Logs'),
        chalk.cyan('Last Seen')
      ],
      colWidths: [12, 20, 10, 12, 8, 20],
      style: { head: [], border: ['grey'] }
    });
    
    devices.forEach(device => {
      table.push([
        chalk.white(device.id),
        device.name,
        device.os === 'IOS' ? chalk.blue(device.os) : chalk.green(device.os),
        formatStatus(device.status),
        chalk.yellow(device.logCount),
        formatTime(device.lastSeen)
      ]);
    });
    
    console.log('\n' + table.toString() + '\n');
  } catch (err) {
    console.error(chalk.red('Error fetching devices:', err.message));
  }
}

// Show logs for a specific device
async function showDeviceLogs(deviceId, limit = 50) {
  try {
    const response = await axios.get(`${BASE_URL}/api/devices/${deviceId}/logs?limit=${limit}`);
    const { deviceName, logs } = response.data;
    
    if (logs.length === 0) {
      console.log(chalk.yellow(`\nNo logs for ${deviceName}\n`));
      return;
    }
    
    console.log(chalk.cyan(`\n📱 ${deviceName} (${deviceId}) - Latest ${logs.length} logs\n`));
    
    logs.forEach(log => {
      const colorFunc = logLevelColors[log.level] || chalk.white;
      const levelBadge = colorFunc(`[${log.level.padEnd(7)}]`);
      const tag = chalk.gray(`[${log.tag}]`);
      const time = chalk.gray(formatTime(log.timestamp));
      
      console.log(`${time} ${levelBadge} ${tag} ${log.message}`);
    });
    
    console.log();
  } catch (err) {
    if (err.response?.status === 404) {
      console.error(chalk.red(`Device not found: ${deviceId}`));
    } else {
      console.error(chalk.red('Error fetching logs:', err.message));
    }
  }
}

// Show logs from multiple devices
async function showMultiDeviceLogs(deviceIds, limit = 50) {
  try {
    const response = await axios.post(`${BASE_URL}/api/devices/logs/multi`, {
      deviceIds,
      limit
    });
    
    const result = response.data;
    
    console.log(chalk.cyan(`\n📱 Logs from ${deviceIds.length} device(s)\n`));
    
    Object.entries(result).forEach(([deviceId, data]) => {
      const statusIcon = data.status === 'online' ? '🟢' : '🔴';
      console.log(`${statusIcon} ${data.deviceName} (${deviceId}) - ${data.os}`);
      
      if (data.logs.length === 0) {
        console.log(chalk.gray('  No logs'));
      } else {
        data.logs.forEach(log => {
          const colorFunc = logLevelColors[log.level] || chalk.white;
          const levelBadge = colorFunc(`[${log.level.padEnd(7)}]`);
          const tag = chalk.gray(`[${log.tag}]`);
          const time = chalk.gray(formatTime(log.timestamp));
          
          console.log(`  ${time} ${levelBadge} ${tag} ${log.message}`);
        });
      }
      console.log();
    });
  } catch (err) {
    console.error(chalk.red('Error fetching logs:', err.message));
  }
}

// Watch logs in real-time
async function watchLogs(filterDeviceId = null) {
  console.log(chalk.cyan('\n👀 Watching logs (Ctrl+C to stop)...\n'));
  
  const ws = new WebSocket(WS_URL);
  
  ws.on('open', () => {
    console.log(chalk.green('Connected to logger server'));
  });
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'log') {
        const log = data.data;
        
        // Filter if specified
        if (filterDeviceId && log.deviceId !== filterDeviceId) {
          return;
        }
        
        const colorFunc = logLevelColors[log.level] || chalk.white;
        const levelBadge = colorFunc(`[${log.level.padEnd(7)}]`);
        const tag = chalk.gray(`[${log.tag}]`);
        const time = chalk.gray(formatTime(log.timestamp));
        const device = chalk.cyan(`[${log.deviceName}]`);
        
        console.log(`${time} ${device} ${levelBadge} ${tag} ${log.message}`);
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });
  
  ws.on('error', (err) => {
    console.error(chalk.red('WebSocket error:', err.message));
  });
  
  ws.on('close', () => {
    console.log(chalk.yellow('\nDisconnected from server'));
    process.exit(0);
  });
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\nStopping watch...'));
    ws.close();
    process.exit(0);
  });
}

// Clear logs
async function clearDeviceLogs(deviceId) {
  try {
    await axios.delete(`${BASE_URL}/api/devices/${deviceId}/logs`);
    console.log(chalk.green(`✓ Logs cleared for device ${deviceId}`));
  } catch (err) {
    if (err.response?.status === 404) {
      console.error(chalk.red(`Device not found: ${deviceId}`));
    } else {
      console.error(chalk.red('Error clearing logs:', err.message));
    }
  }
}

// Show help
function showHelp() {
  console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════════════╗
║                    📊 PRODUCTION LOGGER CLI                    ║
╚════════════════════════════════════════════════════════════════╝

COMMANDS:
  list                          List all connected devices
  logs <DEVICE_ID>             Show logs for a specific device
  logs <ID1> <ID2> <ID3>       Show logs from multiple devices
  watch                        Watch logs in real-time (all devices)
  watch <DEVICE_ID>            Watch logs for specific device
  clear <DEVICE_ID>            Clear logs for a device
  help                          Show this help message
  exit                          Exit the CLI

EXAMPLES:
  $ list
  $ logs ABC12345
  $ logs ABC12345 DEF67890 GHI34567
  $ watch
  $ watch ABC12345
  $ clear ABC12345

  `));
}

// Main REPL
function startREPL() {
  showHelp();
  
  const promptUser = () => {
    rl.question(chalk.cyan('\n> '), async (input) => {
      const parts = input.trim().split(/\s+/);
      const command = parts[0]?.toLowerCase();
      
      switch (command) {
        case 'list':
          await listDevices();
          break;
          
        case 'logs':
          if (parts.length < 2) {
            console.log(chalk.yellow('Usage: logs <DEVICE_ID> [DEVICE_ID2] ...'));
          } else if (parts.length === 2) {
            await showDeviceLogs(parts[1]);
          } else {
            await showMultiDeviceLogs(parts.slice(1));
          }
          break;
          
        case 'watch':
          if (parts.length === 1) {
            await watchLogs();
          } else {
            await watchLogs(parts[1]);
          }
          return; // Don't prompt again after watch
          
        case 'clear':
          if (parts.length < 2) {
            console.log(chalk.yellow('Usage: clear <DEVICE_ID>'));
          } else {
            await clearDeviceLogs(parts[1]);
          }
          break;
          
        case 'help':
          showHelp();
          break;
          
        case 'exit':
        case 'quit':
          console.log(chalk.cyan('👋 Goodbye!'));
          rl.close();
          process.exit(0);
          
        case '':
          break;
          
        default:
          console.log(chalk.yellow(`Unknown command: ${command}. Type 'help' for available commands.`));
      }
      
      promptUser();
    });
  };
  
  promptUser();
}

// Start the CLI
startREPL();