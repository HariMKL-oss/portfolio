const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const cloudflaredPath = path.join(__dirname, 'bin', 'cloudflared.exe');

if (!fs.existsSync(cloudflaredPath)) {
  console.error('Error: cloudflared.exe not found in bin directory.');
  process.exit(1);
}

// 1. Ensure local server is running on port 5050
function ensureServerRunning() {
  return new Promise((resolve) => {
    http.get('http://localhost:5050/api/config', () => {
      resolve();
    }).on('error', () => {
      console.log('[*] Starting local LaTeX Resume Studio server...');
      const serverProcess = spawn('node', ['server.js'], {
        cwd: __dirname,
        detached: true,
        stdio: 'ignore'
      });
      serverProcess.unref();
      setTimeout(resolve, 1500);
    });
  });
}

async function startSharing() {
  await ensureServerRunning();

  console.log('===========================================================');
  console.log('  🌐 Generating 1-Click Secure Sharing Link For Your Friend');
  console.log('===========================================================');
  console.log('\n[1/2] Connecting to Cloudflare secure network...');

  const tunnel = spawn(cloudflaredPath, ['tunnel', '--url', 'http://127.0.0.1:5050'], {
    windowsHide: false
  });

let urlFound = false;

tunnel.stderr.on('data', (data) => {
  const str = data.toString();
  const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && !urlFound) {
    urlFound = true;
    const shareUrl = match[0];

    console.log('\n===========================================================');
    console.log('  🎉 READY TO SHARE! SEND THIS LINK TO YOUR FRIEND:');
    console.log('===========================================================');
    console.log(`\n  👉  ${shareUrl}\n`);
    console.log('  ✅ Link is automatically copied to your clipboard!');
    console.log('  ✅ Your friend can open this from anywhere in the world');
    console.log('     on any phone, laptop, or computer.');
    console.log('===========================================================\n');
    console.log('Keep this window open while your friend is using the app.\n');

    // Copy to clipboard on Windows
    const proc = spawn('clip', { stdio: ['pipe', 'ignore', 'ignore'] });
    proc.stdin.write(shareUrl);
    proc.stdin.end();

    // Open in browser
    spawn('cmd.exe', ['/c', 'start', shareUrl], { detached: true, stdio: 'ignore' }).unref();
  }
});

  tunnel.on('close', (code) => {
    console.log(`Tunnel closed (code ${code})`);
  });
}

startSharing();
