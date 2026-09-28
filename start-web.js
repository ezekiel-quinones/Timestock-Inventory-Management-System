const { spawn } = require('child_process');
const { randomBytes } = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = __dirname;
const URL = 'http://127.0.0.1:8000/login';
const frontendIndex = path.join(ROOT, 'frontend', 'dist', 'index.html');

if (!fs.existsSync(frontendIndex)) {
  console.error('Frontend build missing. Run npm --prefix frontend install and npm --prefix frontend run build first.');
  process.exit(1);
}

const venvPython = path.join(
  ROOT,
  '.venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'
);
const python = process.env.PYTHON || (fs.existsSync(venvPython) ? venvPython : 'python');

const backend = spawn(python, [
  '-m', 'uvicorn', 'backend.main:app',
  '--host', '127.0.0.1', '--port', '8000'
], {
  cwd: ROOT,
  stdio: 'inherit',
  env: {
    ...process.env,
    SESSION_SECRET: process.env.SESSION_SECRET || randomBytes(32).toString('hex')
  }
});

let running = true;

backend.on('error', (error) => {
  running = false;
  process.exitCode = 1;
  console.error(`Could not start Python (${error.message}). Follow the setup steps in README.md.`);
});

backend.on('exit', (code) => {
  running = false;
  process.exitCode = code ?? 1;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => backend.kill('SIGTERM'));
}

function openBrowser() {
  const command = process.platform === 'win32'
    ? 'explorer.exe'
    : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const browser = spawn(command, [URL], { detached: true, stdio: 'ignore' });
  browser.on('error', () => console.log(`Open ${URL} in your browser.`));
  browser.unref();
}

function waitForBackend() {
  if (!running) return;

  const request = http.get(URL, (response) => {
    response.resume();
    if (response.statusCode === 200 && running) {
      console.log(`Web app ready at ${URL}`);
      if (process.env.NO_BROWSER !== '1') openBrowser();
    } else {
      setTimeout(waitForBackend, 500);
    }
  });

  request.setTimeout(2000, () => request.destroy());
  request.on('error', () => setTimeout(waitForBackend, 500));
}

console.log('Starting TimeStock web app...');
waitForBackend();
