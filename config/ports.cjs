const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');

function applyEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadEnvFiles() {
  if (process.env.BACKEND_PORT?.trim()) {
    return;
  }
  const envPath = path.join(rootDir, '.env');
  const examplePath = path.join(rootDir, '.env.example');
  if (fs.existsSync(envPath)) {
    applyEnvFile(envPath);
    return;
  }
  if (fs.existsSync(examplePath)) {
    applyEnvFile(examplePath);
    return;
  }
  throw new Error('.env is missing. Run: cp .env.example .env');
}

function parsePort(name) {
  const raw = process.env[name];
  if (raw === undefined || String(raw).trim() === '') {
    throw new Error(
      `${name} is required. Set it in .env (see .env.example).`
    );
  }
  const port = parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid ${name}: ${raw}`);
  }
  return port;
}

loadEnvFiles();

const BACKEND_PORT = parsePort('BACKEND_PORT');
const FRONTEND_PORT = process.env.FRONTEND_PORT?.trim()
  ? parsePort('FRONTEND_PORT')
  : BACKEND_PORT;

module.exports = {
  BACKEND_PORT,
  FRONTEND_PORT,
};
