# 📊 Production Logger - Real-time Mobile Device Logging

A complete production logging system for iOS and Android apps with real-time log streaming, device management, and powerful CLI tools.

## 🌟 Features

- ✅ **Real-time Log Streaming** - Logs appear instantly on CLI as devices send them
- ✅ **Device Management** - Each device gets a unique ID when it connects
- ✅ **Multi-Device Support** - View logs from 1 or multiple devices simultaneously
- ✅ **iOS & Android Ready** - SDK works with native and React Native apps
- ✅ **Log Levels** - Support for INFO, ERROR, WARN, DEBUG, VERBOSE
- ✅ **Persistent Storage** - Keep up to 1000 logs per device
- ✅ **Command Line Interface** - Interactive CLI for device management
- ✅ **WebSocket Support** - Real-time updates and live log watching
- ✅ **Offline Queue** - Logs are queued when offline and sent when reconnected

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Logger Server

```bash
npm start
# Server will run on http://localhost:3000
```

### 3. Open CLI in Another Terminal

```bash
npm run cli
# Interactive CLI prompt will appear
```

## 📱 Mobile Integration

### React Native Setup

```javascript
import ProductionLogger from './mobile-logger-sdk';

// Initialize once in your App.js
const logger = new ProductionLogger({
  serverUrl: 'http://YOUR_SERVER_IP:3000',
  deviceName: 'iPhone 14',
  osType: 'iOS'
});

// Export for use in components
export default logger;

// Use in your components
import logger from './logger';

export function LoginScreen() {
  const handleLogin = () => {
    logger.info('User attempting login', { email: 'user@example.com' });
    // ... login logic
  };
  
  const handleError = (error) => {
    logger.error('Login failed', { 
      message: error.message,
      code: error.code 
    });
  };
}
```

### Native Android (Java/Kotlin)

1. Add WebSocket library to build.gradle:
```gradle
dependencies {
    implementation 'com.neovisionaries:nv-websocket-client:2.14'
}
```

2. Create ProductionLogger class:
```java
public class ProductionLogger {
    private String serverUrl;
    private String deviceId;
    private WebSocket ws;
    
    public ProductionLogger(String serverUrl, String deviceName) {
        this.serverUrl = serverUrl;
        registerDevice(deviceName);
    }
    
    private void registerDevice(String deviceName) {
        // HTTP POST to /api/register-device
        // Get deviceId from response
        // Connect WebSocket
    }
    
    public void info(String message) {
        sendLog("INFO", message, null);
    }
    
    public void error(String message, JSONObject data) {
        sendLog("ERROR", message, data);
    }
    
    private void sendLog(String level, String message, JSONObject data) {
        JSONObject log = new JSONObject();
        log.put("type", "log");
        log.put("level", level);
        log.put("message", message);
        if (data != null) log.put("data", data);
        
        ws.sendText(log.toString());
    }
}
```

### Native iOS (Swift)

```swift
import Foundation

class ProductionLogger: NSObject, URLSessionWebSocketDelegate {
    var webSocket: URLSessionWebSocket?
    var deviceId: String?
    
    func initialize(serverUrl: String, deviceName: String) {
        registerDevice(serverUrl: serverUrl, deviceName: deviceName)
    }
    
    private func registerDevice(serverUrl: String, deviceName: String) {
        let url = URL(string: "\(serverUrl)/api/register-device")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        let body = ["deviceName": deviceName, "osType": "iOS"]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, _, _ in
            if let data = data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let id = json["deviceId"] as? String {
                self.deviceId = id
                self.connectWebSocket(serverUrl: serverUrl)
            }
        }.resume()
    }
    
    private func connectWebSocket(serverUrl: String) {
        let wsUrl = URL(string: serverUrl.replacingOccurrences(of: "http", with: "ws") + "/logs")!
        self.webSocket = URLSessionWebSocket(url: wsUrl)
        self.webSocket?.resume()
    }
    
    func info(_ message: String) {
        log(level: "INFO", message: message, data: nil)
    }
    
    func error(_ message: String, _ data: [String: Any]? = nil) {
        log(level: "ERROR", message: message, data: data)
    }
    
    private func log(level: String, message: String, data: [String: Any]?) {
        var logData: [String: Any] = [
            "type": "log",
            "level": level,
            "message": message
        ]
        if let data = data {
            logData["data"] = data
        }
        
        if let jsonData = try? JSONSerialization.data(withJSONObject: logData),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            webSocket?.send(.string(jsonString)) { _ in }
        }
    }
}
```

## 💻 CLI Commands

### List All Connected Devices

```bash
> list

╔════════════════════════════════════════════════════════════════╗
║ Device ID │ Name         │ OS      │ Status  │ Logs │ Last Seen
╠════════════════════════════════════════════════════════════════╣
║ ABC12345  │ iPhone 14    │ IOS     │ ● ONLINE │  234 │ 14:35:42
║ DEF67890  │ Samsung S23  │ ANDROID │ ● ONLINE │  156 │ 14:35:41
║ GHI34567  │ iPad Air     │ IOS     │ ● OFFLINE│  89  │ 14:20:15
╚════════════════════════════════════════════════════════════════╝
```

### View Logs for Single Device

```bash
> logs ABC12345

📱 iPhone 14 (ABC12345) - Latest 50 logs

14:35:42 [INFO   ] [AUTH] User login successful
14:35:43 [DEBUG  ] [NETWORK] GET /api/user - 200ms
14:35:44 [INFO   ] [UI] HomeScreen loaded
14:35:45 [WARN   ] [CACHE] Cache size: 145MB
14:35:46 [ERROR  ] [NETWORK] Failed to fetch posts: timeout
```

### View Logs from Multiple Devices

```bash
> logs ABC12345 DEF67890 GHI34567

📱 Logs from 3 device(s)

🟢 iPhone 14 (ABC12345) - IOS
  14:35:42 [INFO   ] [AUTH] User login
  14:35:43 [DEBUG  ] [NETWORK] API call

🟢 Samsung S23 (DEF67890) - ANDROID
  14:35:41 [INFO   ] [AUTH] User authenticated
  14:35:42 [ERROR  ] [STORAGE] DB write failed

🔴 iPad Air (GHI34567) - IOS
  14:20:15 [WARN   ] [BATTERY] Low battery mode
```

### Watch Logs in Real-Time

```bash
> watch

👀 Watching logs (Ctrl+C to stop)...

14:35:42 [iPhone 14] [INFO   ] [AUTH] User login
14:35:43 [Samsung] [DEBUG  ] [NETWORK] Fetching data
14:35:44 [iPad Air] [WARN   ] [BATTERY] 20% battery
14:35:45 [iPhone 14] [ERROR  ] [API] Network timeout
```

### Watch Logs for Specific Device

```bash
> watch ABC12345

👀 Watching logs for iPhone 14 (Ctrl+C to stop)...

14:35:42 [INFO   ] [AUTH] User login
14:35:43 [DEBUG  ] [NETWORK] GET /users
14:35:44 [INFO   ] [UI] Profile loaded
```

### Clear Logs

```bash
> clear ABC12345
✓ Logs cleared for device ABC12345
```

### Show Help

```bash
> help
```

## 🔧 Configuration

### Server Environment Variables

```bash
PORT=3000                    # Server port
LOGGER_WS=ws://localhost:3000  # WebSocket URL
NODE_ENV=production         # Environment
```

### Mobile Logger Configuration

```javascript
const logger = new ProductionLogger({
  serverUrl: 'http://192.168.1.100:3000',    // Required
  deviceName: 'My iPhone 14',                  // Required
  osType: 'iOS',                               // Required: iOS, Android, Web
  tag: 'MYAPP',                                // Optional, default: APP
  maxQueueSize: 100,                           // Optional, offline queue size
  maxReconnectAttempts: 5,                     // Optional
  reconnectDelay: 3000                         // Optional, in milliseconds
});
```

## 📊 Log Entry Structure

Each log has:
- **timestamp** - When it was logged (ISO 8601)
- **level** - Log level (INFO, ERROR, WARN, DEBUG, VERBOSE)
- **message** - Main message text
- **tag** - Category tag for the log
- **data** - Optional additional data (object)
- **deviceId** - Unique device identifier
- **deviceName** - Human-readable device name

## 🌐 API Endpoints

### Device Registration
```
POST /api/register-device
Body: { deviceName: string, osType: string }
Returns: { deviceId: string, wsUrl: string }
```

### List Devices
```
GET /api/devices
Returns: Array of device objects
```

### Get Device Logs
```
GET /api/devices/:deviceId/logs?limit=50
Returns: { deviceId, deviceName, logs: Array }
```

### Get Multiple Device Logs
```
POST /api/devices/logs/multi
Body: { deviceIds: string[], limit: number }
Returns: { [deviceId]: { deviceName, os, status, logs } }
```

### Clear Device Logs
```
DELETE /api/devices/:deviceId/logs
Returns: { message: "Logs cleared" }
```

### WebSocket Connection
```
ws://localhost:3000
Messages:
- { type: 'init', deviceId: string }
- { type: 'log', level, message, tag, data }
```

## 🎯 Use Cases

### User Support & Debugging
Send logs from user devices to diagnose issues in production without asking users for technical details.

### Performance Monitoring
Track app performance metrics, API response times, and resource usage in real devices.

### Crash Analysis
Capture error logs and stack traces from production to identify and fix bugs faster.

### Analytics
Gather user behavior data, feature usage, and user journey information.

### Security Auditing
Monitor authentication, authorization, and suspicious activity in your apps.

## 🚨 Best Practices

1. **Don't Log Sensitive Data**
   ```javascript
   // ❌ Bad
   logger.info('User password:', password);
   
   // ✅ Good
   logger.info('User authenticated successfully');
   ```

2. **Use Appropriate Log Levels**
   ```javascript
   logger.debug('Variable value: ' + x);    // Development
   logger.info('User action completed');    // General info
   logger.warn('Deprecated API used');      // Warnings
   logger.error('Network request failed');  // Errors
   ```

3. **Add Context**
   ```javascript
   // ❌ Bad
   logger.error('Failed');
   
   // ✅ Good
   logger.error('Failed to fetch user profile', {
     userId: 123,
     endpoint: '/api/users/123',
     status: 404
   });
   ```

4. **Use Tags for Organization**
   ```javascript
   const authLogger = new ProductionLogger({...});
   authLogger.setTag('AUTH');
   
   const networkLogger = new ProductionLogger({...});
   networkLogger.setTag('NETWORK');
   ```

5. **Handle Connection Issues**
   ```javascript
   // SDK automatically queues logs if offline
   // They'll be sent when connection resumes
   logger.info('This might be offline');
   logger.info('Will be sent when online');
   ```

## 📦 Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY logger-server.js .
EXPOSE 3000

CMD ["node", "logger-server.js"]
```

### AWS/Cloud Setup

1. Deploy server to EC2 or similar
2. Use fixed IP address for device configuration
3. Configure security groups/firewall for:
   - TCP port 3000 (HTTP/WebSocket)
   - Optional: Restrict to known device IPs
4. Use environment variables for configuration
5. Set up logs rotation for long-running servers

## 🔐 Security Recommendations

1. **Authentication** - Add API keys for device registration
2. **HTTPS/WSS** - Use secure WebSocket in production
3. **Rate Limiting** - Prevent log flooding
4. **Data Retention** - Implement log purging policies
5. **Access Control** - Restrict CLI access to authorized users
6. **Encryption** - Encrypt sensitive log data

## 📄 License

MIT

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

**Questions?** Open an issue or check the examples in the code!
