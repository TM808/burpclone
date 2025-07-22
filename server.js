const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Proper analytics storage
const downloads = [];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, 'products.html'));
});

// Remove these routes as they won't be needed anymore
// app.get('/download', (req, res) => {
//     res.sendFile(path.join(__dirname, 'download.html'));
// });
// app.get('/download-progress/:id', (req, res) => {
//     res.sendFile(path.join(__dirname, 'download-progress.html'));
// });

// Modify the submit endpoint to trigger download immediately
app.post('/api/submit', (req, res) => {
    try {
        const { name, email, software } = req.body;
        
        if (!name || !email || !software) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Store download information
        const downloadRecord = {
            id: downloads.length + 1,
            user: { name, email },
            software,
            timestamp: new Date(),
            status: 'completed'
        };
        
        downloads.push(downloadRecord);
        console.log('Download requested:', downloadRecord);

        // Create a demo file if it doesn't exist
        const demoFile = path.join(__dirname, 'demo-software.zip');
        if (!fs.existsSync(demoFile)) {
            fs.writeFileSync(demoFile, 'Demo software content');
        }

        // Send the file directly
        res.download(demoFile, `${software}.zip`, (err) => {
            if (err) {
                downloadRecord.status = 'failed';
                console.error('Download error:', err);
            }
        });
    } catch (error) {
        console.error('Error processing download:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Download tracking API
app.post('/api/submit', (req, res) => {
    try {
        const { name, email, software } = req.body;
        
        if (!name || !email || !software) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Store download information
        const downloadRecord = {
            id: downloads.length + 1,
            user: { name, email },
            software,
            timestamp: new Date(),
            status: 'pending',
            progress: 0
        };
        
        downloads.push(downloadRecord);
        console.log('Download requested:', downloadRecord);
        
        // Start simulating progress
        simulateDownloadProgress(downloadRecord.id);

        res.json({
            success: true,
            downloadId: downloadRecord.id,
            redirectUrl: `/download-progress/${downloadRecord.id}`
        });
    } catch (error) {
        console.error('Error processing download:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Function to simulate download progress
function simulateDownloadProgress(downloadId) {
    const download = downloads.find(d => d.id === downloadId);
    if (!download) return;

    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        download.progress = Math.min(progress, 100);

        if (progress >= 100) {
            download.status = 'completed';
            clearInterval(interval);
        }
    }, 1000);
}

// Serve download progress page
app.get('/download-progress/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'download-progress.html'));
});

// API endpoint to check download status
app.get('/api/download-status/:id', (req, res) => {
    const downloadId = parseInt(req.params.id);
    const download = downloads.find(d => d.id === downloadId);
    
    if (!download) {
        return res.status(404).json({ error: 'Download not found' });
    }
    
    res.json({
        status: download.status,
        progress: download.progress || 0
    });
});

// API endpoint to get all downloads
app.get('/api/downloads', (req, res) => {
    res.json(downloads);
});

// Actual download endpoint
app.get('/api/download/:id', (req, res) => {
    const downloadId = parseInt(req.params.id);
    const download = downloads.find(d => d.id === downloadId);
    
    if (!download) {
        return res.status(404).json({ error: 'Download not found' });
    }
    
    // Simulate file download
    const demoFile = path.join(__dirname, 'demo-software.zip');
    
    // Create a demo file if it doesn't exist
    if (!fs.existsSync(demoFile)) {
        fs.writeFileSync(demoFile, 'Demo software content');
    }
    
    // Update download status
    download.status = 'completed';
    download.progress = 100;
    
    // Send the file
    res.download(demoFile, `${download.software}.zip`, (err) => {
        if (err) {
            download.status = 'failed';
            console.error('Download error:', err);
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});