const http = require('node:http');
const { fetchUrl } = require('../utils/httpClient');

describe('fetchUrl', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/too-long') {
        res.writeHead(414);
        res.end('URI Too Long');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('香港节点');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('returns the UTF-8 response body', async () => {
    await expect(fetchUrl(baseUrl)).resolves.toBe('香港节点');
  });

  it('exposes the HTTP status so callers can recover from HTTP 414', async () => {
    await expect(fetchUrl(`${baseUrl}/too-long`)).rejects.toMatchObject({
      statusCode: 414,
      message: 'HTTP 414, response length 12'
    });
  });
});
