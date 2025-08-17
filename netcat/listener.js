const net = require('net');
const fs = require('fs');

const PORT = 4444;
const LOG_FILE = 'session.log';

const server = net.createServer((socket) => {
    console.log('Client connected:', socket.remoteAddress);
    
    // Log all communications
    const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
    logStream.write(`\n=== New session started at ${new Date()} ===\n`);
    
    socket.on('data', (data) => {
        const output = data.toString();
        process.stdout.write(output);
        logStream.write(output);
    });
    
    process.stdin.on('data', (data) => {
        socket.write(data);
        logStream.write(`CMD: ${data}`);
    });
    
    socket.on('close', () => {
        console.log('Client disconnected');
        logStream.write(`\n=== Session ended at ${new Date()} ===\n`);
        logStream.end();
    });
});

server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});