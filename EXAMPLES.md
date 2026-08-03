# 📝 Production Logger - Usage Examples

## Example 1: Basic React Native Setup

**App.js**
```javascript
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import ProductionLogger from './mobile-logger-sdk';

const logger = new ProductionLogger({
  serverUrl: 'http://192.168.1.100:3000',
  deviceName: 'iPhone 14 Pro',
  osType: 'iOS'
});

export default function App() {
  useEffect(() => {
    logger.info('App started');
    
    return () => {
      logger.info('App closed');
    };
  }, []);
  
  return (
    <View>
      <Text>Production Logger Ready</Text>
    </View>
  );
}

export default logger; // Export for use in other components
```

**LoginScreen.js**
```javascript
import logger from './App';

export function LoginScreen() {
  const handleLogin = async () => {
    logger.info('Login attempt started');
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        logger.info('Login successful', { userId: data.id });
        return data;
      } else {
        logger.error('Login failed', { status: response.status });
      }
    } catch (error) {
      logger.error('Login network error', { 
        message: error.message,
        code: error.code
      });
    }
  };
  
  return (
    <TouchableOpacity onPress={handleLogin}>
      <Text>Login</Text>
    </TouchableOpacity>
  );
}
```

---

## Example 2: E-Commerce App Logging

**ProductListScreen.js**
```javascript
import logger from './logger';

export function ProductListScreen() {
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    logger.setTag('ECOMMERCE');
    
    fetchProducts();
  }, []);
  
  const fetchProducts = async () => {
    const startTime = Date.now();
    
    try {
      logger.debug('Fetching product list');
      
      const response = await fetch('/api/products?limit=20');
      const data = await response.json();
      
      const duration = Date.now() - startTime;
      logger.info('Products fetched', {
        count: data.products.length,
        duration: `${duration}ms`
      });
      
      setProducts(data.products);
    } catch (error) {
      logger.error('Failed to fetch products', {
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  const handleProductTap = (productId) => {
    logger.debug('Product tapped', { productId });
  };
  
  return (
    // UI code...
  );
}
```

**CartScreen.js**
```javascript
import logger from './logger';

export function CartScreen() {
  const handleCheckout = async () => {
    logger.setTag('PAYMENT');
    
    try {
      logger.info('Checkout initiated', { 
        itemCount: cart.length,
        total: cartTotal 
      });
      
      const response = await fetch('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ cart, paymentMethod })
      });
      
      if (response.ok) {
        logger.info('Payment successful', { 
          orderId: response.data.orderId,
          amount: cartTotal
        });
      } else {
        logger.error('Payment failed', {
          status: response.status,
          message: response.data.error
        });
      }
    } catch (error) {
      logger.error('Checkout error', {
        message: error.message,
        stage: 'payment_processing'
      });
    }
  };
  
  return (
    // UI code...
  );
}
```

---

## Example 3: Social Media App Logging

**FeedScreen.js**
```javascript
import logger from './logger';

logger.setTag('FEED');

export function FeedScreen() {
  const [posts, setPosts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const refreshFeed = async () => {
    setIsRefreshing(true);
    logger.debug('Pull-to-refresh started');
    
    try {
      const response = await fetch('/api/feed?limit=50');
      const newPosts = await response.json();
      
      logger.info('Feed refreshed', { 
        newPostCount: newPosts.length,
        timestamp: new Date().toISOString()
      });
      
      setPosts(newPosts);
    } catch (error) {
      logger.error('Feed refresh failed', {
        message: error.message,
        retryCount: retryAttempts
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return (
    // UI code...
  );
}
```

**LikeButton.js**
```javascript
import logger from './logger';

logger.setTag('ENGAGEMENT');

export function LikeButton({ postId, liked }) {
  const handleLike = async () => {
    const action = liked ? 'unlike' : 'like';
    
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        logger.debug(`Post ${action}d`, { 
          postId,
          action
        });
      }
    } catch (error) {
      logger.error(`Failed to ${action} post`, {
        postId,
        error: error.message
      });
    }
  };
  
  return (
    // UI code...
  );
}
```

---

## Example 4: Monitoring and Analytics

### CLI Usage Scenarios

**Scenario 1: Support Investigation**

```
User reports: "App crashed when viewing profile"

> list
[Shows all devices]

> logs ABC12345
[Last 50 logs from that device]

[Look for error logs around crash time]
> logs ABC12345
14:35:42 [ERROR] [PROFILE] Failed to load profile image - timeout
14:35:43 [ERROR] [MEMORY] Memory warning: 85% used
14:35:44 [ERROR] [CRASH] Segmentation fault in image renderer

[Now we know the issue: memory pressure + image rendering]
```

**Scenario 2: Performance Investigation**

```
Monitoring dashboard shows slow app performance on iOS

> list
[Shows iOS and Android devices]

> logs ABC12345 DEF67890
[Compare iOS vs Android logs]

iOS logs:
- Load time: 2500ms
- Image decoding: 1800ms
- Layout: 500ms

Android logs:
- Load time: 850ms
- Image decoding: 400ms
- Layout: 300ms

[iOS is taking 3x longer - indicates memory or rendering issue]
```

**Scenario 3: Real-time Issue Detection**

```
Monitoring production, suddenly many devices report errors:

> watch
👀 Watching logs...

14:35:42 [iPhone 1] [ERROR] [API] Network timeout
14:35:43 [Samsung 1] [ERROR] [API] Connection refused
14:35:44 [iPhone 2] [ERROR] [API] 503 Service Unavailable
14:35:45 [iPad 1] [WARN] [RETRY] Retrying request...

[Many devices reporting API errors → Server is down]
```

---

## Example 5: Android Native Implementation

**ProductionLogger.java**
```java
public class ProductionLogger {
    private String serverUrl;
    private String deviceId;
    private String deviceName;
    private WebSocket ws;
    private Queue<JSONObject> messageQueue = new LinkedList<>();
    
    public ProductionLogger(String serverUrl, String deviceName, String osType) {
        this.serverUrl = serverUrl;
        this.deviceName = deviceName;
        registerDevice();
    }
    
    private void registerDevice() {
        String url = serverUrl + "/api/register-device";
        RequestBody body = RequestBody.create(
            MediaType.parse("application/json"),
            new JSONObject()
                .put("deviceName", deviceName)
                .put("osType", "ANDROID")
                .toString()
        );
        
        new OkHttpClient().newCall(new Request.Builder()
            .url(url)
            .post(body)
            .build())
            .enqueue(new Callback() {
                @Override
                public void onResponse(Call call, Response response) {
                    try {
                        JSONObject json = new JSONObject(response.body().string());
                        deviceId = json.getString("deviceId");
                        connectWebSocket();
                    } catch (JSONException e) {
                        Log.e("Logger", "Failed to parse response", e);
                    }
                }
                
                @Override
                public void onFailure(Call call, IOException e) {
                    Log.e("Logger", "Registration failed", e);
                }
            });
    }
    
    private void connectWebSocket() {
        String wsUrl = serverUrl.replace("http", "ws") + "/logs";
        WebSocketListener listener = new WebSocketListener() {
            @Override
            public void onOpen(WebSocket webSocket, Response response) {
                ws = webSocket;
                sendInit();
                flushQueue();
            }
            
            @Override
            public void onMessage(WebSocket webSocket, String text) {
                Log.d("Logger", "Server: " + text);
            }
            
            @Override
            public void onFailure(WebSocket webSocket, Throwable t, Response response) {
                Log.e("Logger", "WebSocket failure", t);
            }
        };
        
        OkHttpClient client = new OkHttpClient();
        Request request = new Request.Builder().url(wsUrl).build();
        client.newWebSocket(request, listener);
    }
    
    private void sendInit() {
        JSONObject init = new JSONObject();
        init.put("type", "init");
        init.put("deviceId", deviceId);
        ws.send(init.toString());
    }
    
    public void info(String message) {
        log("INFO", message, null);
    }
    
    public void error(String message, JSONObject data) {
        log("ERROR", message, data);
    }
    
    private void log(String level, String message, JSONObject data) {
        JSONObject logEntry = new JSONObject();
        logEntry.put("type", "log");
        logEntry.put("level", level);
        logEntry.put("message", message);
        if (data != null) {
            logEntry.put("data", data);
        }
        
        if (ws != null && ws.send(logEntry.toString())) {
            Log.d("Logger", message);
        } else {
            messageQueue.add(logEntry);
        }
    }
    
    private void flushQueue() {
        while (!messageQueue.isEmpty() && ws != null) {
            JSONObject msg = messageQueue.poll();
            ws.send(msg.toString());
        }
    }
}
```

**Usage in Activity**
```java
public class MainActivity extends AppCompatActivity {
    private ProductionLogger logger;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        logger = new ProductionLogger(
            "http://192.168.1.100:3000",
            "Samsung S23",
            "ANDROID"
        );
        
        logger.info("MainActivity created");
    }
    
    private void handleUserLogin() {
        try {
            logger.info("Login attempt", new JSONObject()
                .put("email", email)
                .put("timestamp", System.currentTimeMillis())
            );
            
            // Login logic...
            logger.info("Login successful");
        } catch (Exception e) {
            logger.error("Login failed", new JSONObject()
                .put("error", e.getMessage())
                .put("type", e.getClass().getSimpleName())
            );
        }
    }
}
```

---

## Example 6: Swift iOS Implementation

**ProductionLogger.swift**
```swift
class ProductionLogger {
    var webSocket: URLSessionWebSocket?
    var deviceId: String?
    var serverUrl: String
    var messageQueue: [Data] = []
    
    init(serverUrl: String, deviceName: String, osType: String = "iOS") {
        self.serverUrl = serverUrl
        registerDevice(serverUrl: serverUrl, deviceName: deviceName)
    }
    
    private func registerDevice(serverUrl: String, deviceName: String) {
        guard let url = URL(string: "\(serverUrl)/api/register-device") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "deviceName": deviceName,
            "osType": "iOS"
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { [weak self] data, _, error in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let deviceId = json["deviceId"] as? String else {
                print("Registration failed: \(error?.localizedDescription ?? "Unknown error")")
                return
            }
            
            self?.deviceId = deviceId
            self?.connectWebSocket()
        }.resume()
    }
    
    private func connectWebSocket() {
        guard let deviceId = deviceId,
              let wsUrl = URL(string: serverUrl.replacingOccurrences(of: "http", with: "ws") + "/logs")
        else { return }
        
        webSocket = URLSessionWebSocket(url: wsUrl)
        webSocket?.resume()
        
        sendInit()
        receiveMessage()
    }
    
    private func sendInit() {
        let init: [String: Any] = [
            "type": "init",
            "deviceId": deviceId ?? ""
        ]
        
        if let data = try? JSONSerialization.data(withJSONObject: init),
           let jsonString = String(data: data, encoding: .utf8) {
            webSocket?.send(.string(jsonString)) { _ in }
        }
    }
    
    func info(_ message: String, data: [String: Any]? = nil) {
        log(level: "INFO", message: message, data: data)
    }
    
    func error(_ message: String, data: [String: Any]? = nil) {
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
            webSocket?.send(.string(jsonString)) { [weak self] error in
                if let error = error {
                    self?.messageQueue.append(jsonData)
                }
            }
        }
        
        print("[\(level)] \(message)")
    }
    
    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    print("Server: \(text)")
                case .data(let data):
                    print("Server data: \(data.count) bytes")
                @unknown default:
                    break
                }
                self?.receiveMessage()
            case .failure(let error):
                print("WebSocket error: \(error)")
            }
        }
    }
}
```

**Usage in UIViewController**
```swift
class LoginViewController: UIViewController {
    var logger: ProductionLogger?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        logger = ProductionLogger(
            serverUrl: "http://192.168.1.100:3000",
            deviceName: "iPhone 14 Pro",
            osType: "iOS"
        )
        
        logger?.info("LoginViewController loaded")
    }
    
    @IBAction func loginTapped(_ sender: Any) {
        logger?.info("Login button tapped")
        
        Task {
            do {
                let response = try await login(email: emailField.text!)
                logger?.info("Login successful", data: ["userId": response.id])
            } catch {
                logger?.error("Login failed", data: [
                    "error": error.localizedDescription,
                    "email": emailField.text!
                ])
            }
        }
    }
}
```

---

## Example 7: Backend Event Logging

**Node.js Express Integration**
```javascript
const express = require('express');
const ProductionLogger = require('./mobile-logger-sdk');

const app = express();

// Create separate logger instances for different services
const authLogger = new ProductionLogger({
  serverUrl: 'http://localhost:3000',
  deviceName: 'Backend - Auth Service',
  osType: 'BACKEND'
});
authLogger.setTag('AUTH');

const apiLogger = new ProductionLogger({
  serverUrl: 'http://localhost:3000',
  deviceName: 'Backend - API Service',
  osType: 'BACKEND'
});
apiLogger.setTag('API');

// Log all API requests
app.use((req, res, next) => {
  apiLogger.debug(`${req.method} ${req.path}`);
  next();
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    authLogger.info('Login attempt', { email: req.body.email });
    
    const user = await authenticate(req.body);
    authLogger.info('Login successful', { userId: user.id });
    
    res.json({ token: generateToken(user) });
  } catch (error) {
    authLogger.error('Login failed', { 
      email: req.body.email,
      error: error.message
    });
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.listen(3001);
```

---

These examples show different scenarios and implementations. You can adapt them to your specific needs!
