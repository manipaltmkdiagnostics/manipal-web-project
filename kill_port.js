const cp = require('child_process');

console.log('Scanning for process on port 5000...');
try {
    const stdout = cp.execSync('netstat -ano | findstr :5000', { encoding: 'utf8' });
    if (stdout) {
        const lines = stdout.trim().split('\n');
        const pids = new Set();
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && /^\d+$/.test(pid)) {
                pids.add(pid);
            }
        }
        for (const pid of pids) {
            console.log(`Killing PID: ${pid} running on port 5000...`);
            try {
                cp.execSync(`taskkill /F /PID ${pid}`);
                console.log(`PID ${pid} killed successfully.`);
            } catch (e) {
                console.error(`Failed to kill PID ${pid}:`, e.message);
            }
        }
    } else {
        console.log('No active process found on port 5000.');
    }
} catch (err) {
    if (err.status === 1) {
        console.log('No active process found on port 5000.');
    } else {
        console.error('Error finding processes:', err.message);
    }
}
