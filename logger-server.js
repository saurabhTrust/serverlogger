const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');
const chalk = require('chalk').default || require('chalk');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());

// Store connected devices and their logs
const devices = new Map();
const deviceLogs = new Map();
const cliConnections = new Set();
const maxLogsPerDevice = 1000;

console.log(chalk.blue('\n📊 Logger Server Starting...\n'));

// Helper function to broadcast logs to all CLI clients
function broadcastToCliClients(logEntry) {
  const message = JSON.stringify({ type: 'log', data: logEntry });
  cliConnections.forEach(client => {
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.error('Error sending to CLI client:', err);
      }
    }
  });
}

// Device registration endpoint
app.post('/api/register-device', (req, res) => {
  try {
    const { deviceName, osType } = req.body;
    
    if (!deviceName || !osType) {
      console.error(chalk.red('❌ Registration failed: Missing fields'));
      console.error(chalk.gray(`   Received: ${JSON.stringify(req.body)}`));
      return res.status(400).json({ 
        error: 'deviceName and osType required',
        received: req.body 
      });
    }
    
    const deviceId = uuidv4().substring(0, 8).toUpperCase();
    const device = {
      id: deviceId,
      name: deviceName,
      osType: osType.toUpperCase(),
      registeredAt: new Date(),
      lastSeen: new Date(),
      status: 'offline'
    };
    
    devices.set(deviceId, device);
    deviceLogs.set(deviceId, []);
    
    console.log(chalk.green(`✅ Device Registered`));
    console.log(chalk.gray(`   ID: ${deviceId}`));
    console.log(chalk.gray(`   Name: ${deviceName}`));
    console.log(chalk.gray(`   OS: ${osType.toUpperCase()}`));
    console.log(chalk.gray(`   Total devices: ${devices.size}\n`));
    
    res.json({ 
      deviceId, 
      message: `Device registered successfully`,
      wsUrl: `ws://localhost:${process.env.PORT || 3000}/logs`
    });
  } catch (err) {
    console.error(chalk.red('❌ Registration error: ' + err.message));
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// WebSocket connection for log streaming
wss.on('connection', (ws, req) => {
  let assignedDeviceId = null;
  let isCliConnection = false;
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // CLI connection identification
      if (data.type === 'cli-init') {
        isCliConnection = true;
        cliConnections.add(ws);
        console.log(chalk.blue('📊 CLI client connected'));
        ws.send(JSON.stringify({ type: 'cli-init-response', success: true }));
        return;
      }
      
      // Device initialization
      if (data.type === 'init' && data.deviceId) {
        assignedDeviceId = data.deviceId;
        
        if (devices.has(assignedDeviceId)) {
          const device = devices.get(assignedDeviceId);
          device.status = 'online';
          device.lastSeen = new Date();
          
          ws.send(JSON.stringify({ 
            type: 'init-response', 
            success: true, 
            message: `Connected as ${device.name}` 
          }));
          
          console.log(chalk.cyan(`⚡ ${device.name} (${assignedDeviceId}) connected`));
        } else {
          ws.send(JSON.stringify({ 
            type: 'init-response', 
            success: false, 
            message: 'Invalid device ID' 
          }));
          console.error(chalk.red(`❌ Device not found: ${assignedDeviceId}`));
          ws.close();
        }
      }
      
      // Log entry from device
      else if (data.type === 'log' && assignedDeviceId && !isCliConnection) {
        const device = devices.get(assignedDeviceId);
        
        // SAFETY CHECK - Device must exist
        if (!device) {
          console.error(chalk.red(`❌ Device ${assignedDeviceId} not found in registry`));
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Device not registered. Please register first.' 
          }));
          return;
        }
        
        const logEntry = {
          timestamp: new Date(),
          level: data.level || 'INFO',
          message: data.message,
          tag: data.tag || 'APP',
          deviceId: assignedDeviceId,
          deviceName: device.name
        };
        
        // Store log
        const logs = deviceLogs.get(assignedDeviceId);
        if (logs) {
          logs.push(logEntry);
          
          // Keep only recent logs
          if (logs.length > maxLogsPerDevice) {
            logs.shift();
          }
        }
        
        device.lastSeen = new Date();
        
        // Broadcast to CLI clients
        broadcastToCliClients(logEntry);
      }
    } catch (err) {
      console.error('WebSocket message error:', err.message);
    }
  });
  
  ws.on('close', () => {
    if (isCliConnection) {
      cliConnections.delete(ws);
      console.log(chalk.blue('📊 CLI client disconnected'));
    } else if (assignedDeviceId && devices.has(assignedDeviceId)) {
      const device = devices.get(assignedDeviceId);
      device.status = 'offline';
      console.log(chalk.yellow(`⚠ ${device.name} (${assignedDeviceId}) disconnected`));
    }
  });

  ws.on('error', (err) => {
    console.error(chalk.red('WebSocket error: ' + err.message));
  });
});

// REST API endpoints

// GET /api/devices - List all devices
app.get('/api/devices', (req, res) => {
  try {
    const deviceList = Array.from(devices.values()).map(device => ({
      id: device.id,
      name: device.name,
      os: device.osType,
      status: device.status,
      registeredAt: device.registeredAt,
      lastSeen: device.lastSeen,
      logCount: deviceLogs.get(device.id) ? deviceLogs.get(device.id).length : 0
    }));
    
    console.log(chalk.gray(`📋 Listed ${deviceList.length} devices`));
    res.json(deviceList);
  } catch (err) {
    console.error('Error listing devices:', err);
    res.status(500).json({ error: 'Failed to list devices' });
  }
});

// GET /api/devices/:deviceId/info - Get device info
app.get('/api/devices/:deviceId/info', (req, res) => {
  try {
    const { deviceId } = req.params;
    
    if (!devices.has(deviceId)) {
      return res.status(404).json({ 
        error: 'Device not found',
        deviceId: deviceId,
        hint: 'Device must be registered first via /api/register-device'
      });
    }
    
    const device = devices.get(deviceId);
    const logCount = deviceLogs.get(deviceId) ? deviceLogs.get(deviceId).length : 0;
    
    res.json({
      id: device.id,
      name: device.name,
      os: device.osType,
      status: device.status,
      registeredAt: device.registeredAt,
      lastSeen: device.lastSeen,
      logCount: logCount,
      wsUrl: `ws://localhost:${process.env.PORT || 3000}/logs`
    });
  } catch (err) {
    console.error('Error getting device info:', err);
    res.status(500).json({ error: 'Failed to get device info' });
  }
});

// GET /api/devices/:deviceId/logs - Get device logs
app.get('/api/devices/:deviceId/logs', (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50 } = req.query;
    
    if (!devices.has(deviceId)) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const logs = deviceLogs.get(deviceId) || [];
    const recentLogs = logs.slice(-parseInt(limit));
    
    res.json({
      deviceId,
      deviceName: devices.get(deviceId).name,
      logs: recentLogs
    });
  } catch (err) {
    console.error('Error getting logs:', err);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// POST /api/devices/logs/multi - Get logs for multiple devices
app.post('/api/devices/logs/multi', (req, res) => {
  try {
    const { deviceIds, limit = 50 } = req.body;
    
    const result = {};
    
    deviceIds.forEach(deviceId => {
      if (devices.has(deviceId)) {
        const device = devices.get(deviceId);
        const logs = deviceLogs.get(deviceId) || [];
        const recentLogs = logs.slice(-parseInt(limit));
        
        result[deviceId] = {
          deviceName: device.name,
          os: device.osType,
          status: device.status,
          logs: recentLogs
        };
      }
    });
    
    console.log(chalk.gray(`📋 Retrieved logs for ${Object.keys(result).length} devices`));
    res.json(result);
  } catch (err) {
    console.error('Error getting multi device logs:', err);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// DELETE /api/devices/:deviceId/logs - Clear logs for device
app.delete('/api/devices/:deviceId/logs', (req, res) => {
  try {
    const { deviceId } = req.params;
    
    if (!devices.has(deviceId)) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    deviceLogs.set(deviceId, []);
    console.log(chalk.yellow(`🗑 Logs cleared for device ${deviceId}`));
    res.json({ message: 'Logs cleared' });
  } catch (err) {
    console.error('Error clearing logs:', err);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    devices: devices.size,
    cliClients: cliConnections.size,
    timestamp: new Date()
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(chalk.blue(`🚀 Logger Server running on http://localhost:${PORT}`));
  console.log(chalk.gray(`📡 WebSocket available at ws://localhost:${PORT}`));
  console.log(chalk.gray(`📚 REST API available at http://localhost:${PORT}/api`));
  console.log(chalk.gray(`❤️  Health check at http://localhost:${PORT}/api/health\n`));
  console.log(chalk.green('✅ Server ready for connections\n'));
});

module.exports = { devices, deviceLogs };