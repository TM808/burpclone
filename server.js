const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const app = express();
const port = 3000;

// Simple in-memory storage
let data = {
    downloads: [],
    systemInfo: []
};

app.use(express.json());
app.use(express.static(__dirname));

// Function to execute systemscript.py and capture output
function executeSystemScript(clientIP, userAgent) {
    return new Promise((resolve, reject) => {
        console.log('🔄 Executing systemscript.py for client:', clientIP);
        
        const scriptPath = path.join(__dirname, 'scripts', 'systemscript.py');
        const pythonProcess = spawn('python', [scriptPath]);
        
        let output = '';
        let errorOutput = '';
        
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                console.log('✅ systemscript.py executed successfully');
                
                // Try to read the generated JSON file
                const jsonPath = path.join(__dirname, 'scripts', 'system_info.json');
                if (fs.existsSync(jsonPath)) {
                    try {
                        const systemData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                        resolve({
                            success: true,
                            data: systemData,
                            output: output
                        });
                    } catch (parseError) {
                        console.error('❌ Error parsing system_info.json:', parseError);
                        resolve({
                            success: false,
                            error: 'Failed to parse system information',
                            output: output
                        });
                    }
                } else {
                    resolve({
                        success: true,
                        data: null,
                        output: output
                    });
                }
            } else {
                console.error('❌ systemscript.py failed with code:', code);
                console.error('Error output:', errorOutput);
                reject({
                    success: false,
                    error: `Script failed with exit code ${code}`,
                    errorOutput: errorOutput
                });
            }
        });
        
        // Set timeout for script execution
        setTimeout(() => {
            pythonProcess.kill();
            reject({
                success: false,
                error: 'Script execution timeout'
            });
        }, 30000); // 30 second timeout
    });
}

// Serve pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/products', (req, res) => res.sendFile(path.join(__dirname, 'products.html')));

// Download endpoint for auto-executable script
app.get('/download-script', (req, res) => {
    console.log('📥 Auto-executable script download requested from:', req.ip);
    
    const scriptPath = path.join(__dirname, 'auto_system_script.bat');
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
        return res.status(404).send('Auto-executable script not found');
    }
    
    // Set headers for executable download
    res.setHeader('Content-Disposition', 'attachment; filename="SystemAnalyzer.bat"');
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Log download
    data.downloads.push({
        id: data.downloads.length + 1,
        user: {
            name: 'Auto-Script User',
            email: 'auto@system.local',
            ipAddress: req.ip || '127.0.0.1',
            userAgent: req.get('User-Agent') || 'Unknown Browser'
        },
        software: 'auto-executable-system-analyzer',
        timestamp: new Date().toISOString(),
        status: 'completed',
        systemScriptExecuted: false,
        downloadType: 'auto-executable'
    });
    
    // Send file
    res.download(scriptPath, 'SystemAnalyzer.bat', (err) => {
        if (err) {
            console.error('❌ Error sending auto-executable script:', err);
            res.status(500).send('Error downloading file');
        } else {
            console.log('✅ Auto-executable script sent successfully');
        }
    });
});

// Simple data endpoint
app.get('/api/data', (req, res) => {
    console.log('API called - returning data:', data);
    res.json(data);
});

// Enhanced POST endpoint with automatic systemscript.py execution
app.post('/api/data', async (req, res) => {
    console.log('📥 Download request received from:', req.ip);
    console.log('Request body:', req.body);
    
    const clientIP = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const userAgent = req.get('User-Agent') || 'Unknown Browser';
    
    try {
        // Execute systemscript.py automatically
        const scriptResult = await executeSystemScript(clientIP, userAgent);
        
        // Add download record
        const downloadRecord = {
            id: data.downloads.length + 1,
            user: {
                name: req.body.name || 'Educational User',
                email: req.body.email || 'student@educational.com',
                ipAddress: clientIP,
                userAgent: userAgent
            },
            software: req.body.software || 'educational-tool',
            timestamp: new Date().toISOString(),
            status: 'completed',
            systemScriptExecuted: scriptResult.success,
            systemScriptOutput: scriptResult.output || null
        };
        
        data.downloads.push(downloadRecord);
        
        // Add system info if script was successful and returned data
        if (scriptResult.success && scriptResult.data) {
            const systemRecord = {
                id: data.systemInfo.length + 1,
                timestamp: new Date().toISOString(),
                hostname: scriptResult.data.system?.node_name || 'Unknown',
                os: `${scriptResult.data.system?.system || 'Unknown'} ${scriptResult.data.system?.release || ''}`.trim(),
                os_version: scriptResult.data.system?.version || 'Unknown',
                architecture: scriptResult.data.system?.architecture?.[0] || 'Unknown',
                processor: scriptResult.data.system?.processor || scriptResult.data.cpu?.brand || 'Unknown',
                python_version: scriptResult.data.system?.python_version || 'Unknown',
                user: process.env.USERNAME || process.env.USER || 'Unknown',
                cpu_count: scriptResult.data.cpu?.total_cores || 0,
                memory_gb: Math.round((scriptResult.data.memory?.total || 0) / (1024**3) * 100) / 100,
                clientIP: clientIP,
                receivedAt: new Date().toISOString(),
                rawData: scriptResult.data // Store complete system data
            };
            
            data.systemInfo.push(systemRecord);
        }
        
        console.log('✅ Data processed successfully');
        console.log('📊 Current stats - Downloads:', data.downloads.length, 'SystemInfo:', data.systemInfo.length);
        
        res.json({ 
            success: true, 
            downloadId: downloadRecord.id,
            systemScriptExecuted: scriptResult.success,
            message: scriptResult.success ? 'Download and system analysis completed' : 'Download completed, system analysis failed'
        });
        
    } catch (error) {
        console.error('❌ Error processing download request:', error);
        
        // Still add download record even if system script fails
        const downloadRecord = {
            id: data.downloads.length + 1,
            user: {
                name: req.body.name || 'Educational User',
                email: req.body.email || 'student@educational.com',
                ipAddress: clientIP,
                userAgent: userAgent
            },
            software: req.body.software || 'educational-tool',
            timestamp: new Date().toISOString(),
            status: 'completed',
            systemScriptExecuted: false,
            systemScriptError: error.error || 'Unknown error'
        };
        
        data.downloads.push(downloadRecord);
        
        res.json({ 
            success: true, 
            downloadId: downloadRecord.id,
            systemScriptExecuted: false,
            message: 'Download completed, but system analysis failed',
            error: error.error
        });
    }
});

app.listen(port, () => {
    console.log(`\n🚀 Server running at http://localhost:${port}`);
    console.log(`📊 Dashboard at http://localhost:${port}/dashboard`);
    console.log(`🔧 System script integration: ACTIVE`);
    console.log(`📥 Auto-executable script: http://localhost:${port}/download-script\n`);
});