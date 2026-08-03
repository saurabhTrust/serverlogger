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
const maxLogsPerDevice = 1000;

// Device registration endpoint
app.post('/api/register-device', (req, res) => {
  const { deviceName, osType } = req.body;
  
  if (!deviceName || !osType) {
    return res.status(400).json({ error: 'deviceName and osType required' });
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
  
  console.log(chalk.green(`✓ Device registered: ${deviceName} (${osType}) - ID: ${deviceId}`));
  
  res.json({ 
    deviceId, 
    message: `Device registered successfully`,
    wsUrl: `ws://localhost:${PORT}/logs`
  });
});

// WebSocket connection for log streaming
wss.on('connection', (ws) => {
  let assignedDeviceId = null;
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Initial device identification
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
          ws.close();
        }
      }
      
      // Log entry from device
      else if (data.type === 'log' && assignedDeviceId) {
        const device = devices.get(assignedDeviceId);
        
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
        logs.push(logEntry);
        
        // Keep only recent logs
        if (logs.length > maxLogsPerDevice) {
          logs.shift();
        }
        
        device.lastSeen = new Date();
        
        // Broadcast to all connected CLI clients
        broadcastLogUpdate(logEntry);
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });
  
  ws.on('close', () => {
    if (assignedDeviceId && devices.has(assignedDeviceId)) {
      const device = devices.get(assignedDeviceId);
      device.status = 'offline';
      console.log(chalk.yellow(`⚠ ${device.name} (${assignedDeviceId}) disconnected`));
    }
  });
});

// Store CLI connections
const cliConnections = new Set();

// Broadcast log updates to CLI clients
function broadcastLogUpdate(logEntry) {
  const message = JSON.stringify({ type: 'log', data: logEntry });
  cliConnections.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// CLI WebSocket endpoint
app.ws = function(path, callback) {
  wss.on('connection', (ws, req) => {
    if (req.url === path) {
      callback(ws, req);
    }
  });
};

// REST API endpoints for CLI

// List all devices
app.get('/api/devices', (req, res) => {
  const deviceList = Array.from(devices.values()).map(device => ({
    id: device.id,
    name: device.name,
    os: device.osType,
    status: device.status,
    registeredAt: device.registeredAt,
    lastSeen: device.lastSeen,
    logCount: deviceLogs.get(device.id).length
  }));
  
  res.json(deviceList);
});

// Get logs for specific device
app.get('/api/devices/:deviceId/logs', (req, res) => {
  const { deviceId } = req.params;
  const { limit = 50 } = req.query;
  
  if (!devices.has(deviceId)) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  const logs = deviceLogs.get(deviceId);
  const recentLogs = logs.slice(-parseInt(limit));
  
  res.json({
    deviceId,
    deviceName: devices.get(deviceId).name,
    logs: recentLogs
  });
});

// Get logs for multiple devices
app.post('/api/devices/logs/multi', (req, res) => {
  const { deviceIds, limit = 50 } = req.body;
  
  const result = {};
  
  deviceIds.forEach(deviceId => {
    if (devices.has(deviceId)) {
      const device = devices.get(deviceId);
      const logs = deviceLogs.get(deviceId);
      const recentLogs = logs.slice(-parseInt(limit));
      
      result[deviceId] = {
        deviceName: device.name,
        os: device.osType,
        status: device.status,
        logs: recentLogs
      };
    }
  });
  
  res.json(result);
});

// Clear logs for device
app.delete('/api/devices/:deviceId/logs', (req, res) => {
  const { deviceId } = req.params;
  
  if (!devices.has(deviceId)) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  deviceLogs.set(deviceId, []);
  res.json({ message: 'Logs cleared' });
});

const PORT = process.env.PORT || 5050;

server.listen(PORT, () => {
  console.log(chalk.blue(`\n🚀 Logger Server running on http://localhost:${PORT}`));
  console.log(chalk.gray(`WebSocket available at ws://localhost:${PORT}`));
  console.log(chalk.gray(`REST API available at http://localhost:${PORT}/api\n`));
});

module.exports = { devices, deviceLogs };