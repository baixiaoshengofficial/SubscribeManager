const http = require('node:http');
const https = require('node:https');

/**
 * 发起 GET 请求（自动识别 http / https）
 */
function fetchUrl(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      reject(new Error(`Invalid URL: ${error.message}`));
      return;
    }

    const lib = urlObj.protocol === 'https:' ? https : http;
    const req = lib.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode === 200) {
          resolve(data);
          return;
        }
        reject(new Error(`HTTP ${res.statusCode}, response length ${data.length}`));
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

module.exports = { fetchUrl };
