const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Simple in-memory storage
let data = {
    downloads: [],
    systemInfo: []
};

app.use(express.json());
app.use(express.static(__dirname));

// Serve pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/products', (req, res) => res.sendFile(path.join(__dirname, 'products.html')));

// Simple data endpoint
app.get('/api/data', (req, res) => {
    console.log('API called - returning data:', data);
    res.json(data);
});

app.post('/api/data', (req, res) => {
    console.log('Data received:', req.body);
    
    // Add download record
    data.downloads.push({
        id: data.downloads.length + 1,
        user: {
            name: 'Educational User',
            email: 'student@educational.com',
            ipAddress: req.ip || '127.0.0.1',
            userAgent: req.get('User-Agent') || 'Browser'
        },
        software: 'educational-tool',
        timestamp: new Date().toISOString(),
        status: 'completed'
    });
    
    // Add system info
    data.systemInfo.push({
        id: data.systemInfo.length + 1,
        timestamp: new Date().toISOString(),
        hostname: 'STUDENT-PC',
        os: 'Windows 10',
        os_version: '10.0.19041',
        architecture: '64bit',
        processor: 'Intel Core i7',
        python_version: '3.9.0',
        user: 'student',
        cpu_count: 8,
        memory_gb: 16,
        clientIP: req.ip || '127.0.0.1',
        receivedAt: new Date().toISOString()
    });
    
    console.log('Data stored. Downloads:', data.downloads.length, 'SystemInfo:', data.systemInfo.length);
    res.json({ success: true });
});

app.listen(port, () => {
    console.log(`\n🚀 Server running at http://localhost:${port}`);
    console.log(`📊 Dashboard at http://localhost:${port}/dashboard\n`);
});