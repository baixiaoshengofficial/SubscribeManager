const request = require('supertest');
const express = require('express');

// Mock services
jest.mock('../services/subscriptionService');
jest.mock('../services/conversionService');
jest.mock('../utils');

const subscriptionService = require('../services/subscriptionService');
const { ConversionService } = require('../services/conversionService');
const { 
  safeBase64Encode, 
  filterSnellNodes 
} = require('../utils');

// Create test app
const app = express();
app.use(express.json());

const subscriptionRoutes = require('../routes/subscriptionRoutes');
app.use('/', subscriptionRoutes);

const buildSubscriptionData = (nodes, overrides = {}) => ({
  nodes,
  subscriptionUrl: 'http://localhost:3000/test-subscription',
  config: {
    subconvertApi: null,
    customTemplate: null,
    useDefaultTemplate: true,
    ...overrides
  }
});

describe('Subscription Routes', () => {
  let convertMock;
  let getNodesOnlyMock;

  beforeEach(() => {
    jest.clearAllMocks();
    convertMock = jest.fn();
    getNodesOnlyMock = jest.fn();
    ConversionService.mockImplementation(() => ({
      convert: convertMock,
      getNodesOnly: getNodesOnlyMock
    }));
  });

  describe('GET /:path', () => {
    it('should return subscription content for valid path', async () => {
      const path = 'test-subscription';
      const mockContent = 'vmess://link1\nss://link2\nvless://link3';

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );
      filterSnellNodes.mockReturnValue(mockContent);

      const response = await request(app)
        .get(`/${path}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(response.text).toBe(mockContent);
      expect(subscriptionService.generateSubscriptionContent).toHaveBeenCalledWith(path);
    });

    it('should return 404 for non-existent subscription', async () => {
      const path = 'nonexistent';

      subscriptionService.generateSubscriptionContent.mockResolvedValue(null);

      const response = await request(app)
        .get(`/${path}`)
        .expect(404);

      expect(response.body).toEqual({
        error: { code: 404, message: 'Subscription not found' }
      });
    });

    it('should handle service errors', async () => {
      const path = 'test-subscription';
      const error = new Error('Service error');

      subscriptionService.generateSubscriptionContent.mockRejectedValue(error);

      const response = await request(app)
        .get(`/${path}`)
        .expect(500);

      expect(response.body.error.code).toBe(500);
      expect(response.body.error.message).toBe('Internal server error');
    });
  });

  describe('GET /:path?format=v2ray', () => {
    it('should return base64 encoded content for v2ray format', async () => {
      const path = 'test-subscription';
      const mockContent = 'vmess://link1\nss://link2';
      const encodedContent = 'dm1lc3Mov9saW5azE=';

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );
      filterSnellNodes.mockReturnValue(mockContent);
      safeBase64Encode.mockReturnValue(encodedContent);

      const response = await request(app)
        .get(`/${path}?format=v2ray`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(response.text).toBe(encodedContent);
      expect(filterSnellNodes).toHaveBeenCalledWith(mockContent);
      expect(safeBase64Encode).toHaveBeenCalledWith(mockContent);
    });
  });

  describe('GET /:path?format=clash', () => {
    it('should return content for clash format with BOM', async () => {
      const path = 'test-subscription';
      const mockContent = 'vmess://link1\nss://link2';
      const clashContent = 'proxies:\n  - vmess link\n  - ss link';

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );
      filterSnellNodes.mockReturnValue(mockContent);
      convertMock.mockResolvedValue(clashContent);

      const response = await request(app)
        .get(`/${path}?format=clash`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(response.text).toBe(`\uFEFF${clashContent}`);
      expect(convertMock).toHaveBeenCalledWith(mockContent, 'clash', expect.objectContaining({
        subscriptionUrl: 'http://localhost:3000/test-subscription'
      }));
    });
  });

  describe('GET /:path?format=surge', () => {
    it('should return surge format content with BOM', async () => {
      const path = 'test-subscription';
      const mockContent = 'vmess://link1\nss://link2';
      const surgeContent = '[Proxy Group]\nvmess link\nss link';

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );
      filterSnellNodes.mockReturnValue(mockContent);
      convertMock.mockResolvedValue(surgeContent);

      const response = await request(app)
        .get(`/${path}?format=surge`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(response.text).toBe(`\uFEFF${surgeContent}`);
      expect(convertMock).toHaveBeenCalledWith(mockContent, 'surge', expect.any(Object));
    });
  });

  describe('GET /:path?format=shadowsocks', () => {
    it('should return shadowsocks format content with BOM', async () => {
      const path = 'test-subscription';
      const mockContent = 'vmess://link1\nss://link2';
      const ssContent = 'shadowsocks format content';

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );
      filterSnellNodes.mockReturnValue(mockContent);
      convertMock.mockResolvedValue(ssContent);

      const response = await request(app)
        .get(`/${path}?format=shadowsocks`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(response.text).toBe(`\uFEFF${ssContent}`);
      expect(convertMock).toHaveBeenCalledWith(mockContent, 'shadowsocks', expect.any(Object));
    });
  });

  describe('GET /:path?format=unsupported', () => {
    it('should return 404 for unsupported format', async () => {
      const path = 'test-subscription';
      const mockContent = 'vmess://link1';

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );

      const response = await request(app)
        .get(`/${path}?format=unsupported`)
        .expect(404);

      expect(response.body).toEqual({
        error: { code: 404, message: 'Unsupported format' }
      });
    });
  });

  describe('GET /:path/:format', () => {
    it('should handle path-based format specification', async () => {
      const path = 'test-subscription';
      const format = 'clash';
      const mockContent = 'vmess://link1';
      const clashContent = 'yaml content';

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );
      filterSnellNodes.mockReturnValue(mockContent);
      convertMock.mockResolvedValue(clashContent);

      const response = await request(app)
        .get(`/${path}/${format}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(response.text).toBe(`\uFEFF${clashContent}`);
      expect(convertMock).toHaveBeenCalledWith(mockContent, format, expect.any(Object));
    });

    it('should return v2ray base64 format', async () => {
      const path = 'test-subscription';
      const format = 'v2ray';
      const mockContent = 'vmess://link1';
      const encodedContent = 'base64content';

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );
      filterSnellNodes.mockReturnValue(mockContent);
      safeBase64Encode.mockReturnValue(encodedContent);

      const response = await request(app)
        .get(`/${path}/${format}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(response.text).toBe(encodedContent);
    });

    it('should return 404 for unsupported format in path', async () => {
      const path = 'test-subscription';
      const format = 'unsupported';
      const mockContent = 'vmess://link1';

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );

      const response = await request(app)
        .get(`/${path}/${format}`)
        .expect(404);

      expect(response.body).toEqual({
        error: { code: 404, message: 'Unsupported format' }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty subscription content', async () => {
      const path = 'empty-subscription';
      const mockContent = '';

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );
      filterSnellNodes.mockReturnValue(mockContent);

      const response = await request(app)
        .get(`/${path}`)
        .expect(200);

      expect(response.text).toBe('');
      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
    });

    it('should handle subscription content with only snell nodes', async () => {
      const path = 'snell-only-subscription';
      const mockContent = 'Node1=snell,server,1000,cipher,password\nNode2=snell,server2,2000,cipher2,password2';
      const filteredContent = '';

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );
      filterSnellNodes.mockReturnValue(filteredContent);

      const response = await request(app)
        .get(`/${path}`)
        .expect(200);

      expect(response.text).toBe('');
    });

    it('should handle special characters in path', async () => {
      const path = 'test-subscription-with-dashes_and_123';
      const mockContent = 'vmess://link1';

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );
      filterSnellNodes.mockReturnValue(mockContent);

      await request(app)
        .get(`/${path}`)
        .expect(200);

      expect(subscriptionService.generateSubscriptionContent).toHaveBeenCalledWith(path);
    });

    it('should handle very long subscription paths', async () => {
      const longPath = 'a'.repeat(50); // Max length
      const mockContent = 'vmess://link1';

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );
      filterSnellNodes.mockReturnValue(mockContent);

      await request(app)
        .get(`/${longPath}`)
        .expect(200);

      expect(subscriptionService.generateSubscriptionContent).toHaveBeenCalledWith(longPath);
    });

    it('should handle malformed query parameters gracefully', async () => {
      const path = 'test-subscription';
      const mockContent = 'vmess://link1';

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );
      filterSnellNodes.mockReturnValue(mockContent);

      const response = await request(app)
        .get(`/${path}?format=&invalid=param`)
        .expect(200);

      expect(response.text).toBe(mockContent);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const path = 'error-subscription';
      const error = new Error('Database connection failed');

      subscriptionService.generateSubscriptionContent.mockRejectedValue(error);

      const response = await request(app)
        .get(`/${path}`)
        .expect(500);

      expect(response.body.error.code).toBe(500);
      expect(response.body.error.message).toBe('Internal server error');
      expect(response.body.error.details).toBe(error.message);
    });

    it('should handle encoding errors', async () => {
      const path = 'encoding-error-subscription';
      const mockContent = 'vmess://link1';
      const error = new Error('Encoding failed');

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );
      filterSnellNodes.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .get(`/${path}`)
        .expect(500);

      expect(response.body.error.code).toBe(500);
    });

    it('should handle conversion errors', async () => {
      const path = 'conversion-error-subscription';
      const mockContent = 'vmess://link1';
      const error = new Error('Conversion failed');

      subscriptionService.generateSubscriptionContent.mockResolvedValue(
        buildSubscriptionData(mockContent)
      );
      filterSnellNodes.mockReturnValue(mockContent);
      convertMock.mockRejectedValue(error);

      const response = await request(app)
        .get(`/${path}?format=clash`)
        .expect(500);

      expect(response.body.error.code).toBe(500);
    });
  });

  describe('Content Type Headers', () => {
    it('should set correct content-type for different formats', async () => {
      const path = 'test-subscription';
      const mockContent = 'vmess://link1';
      const testCases = [
        { format: 'clash', expectedType: 'text/plain; charset=utf-8' },
        { format: 'surge', expectedType: 'text/plain; charset=utf-8' },
        { format: 'shadowsocks', expectedType: 'text/plain; charset=utf-8' },
        { format: 'v2ray', expectedType: 'text/plain; charset=utf-8' },
        { format: undefined, expectedType: 'text/plain; charset=utf-8' }
      ];

      for (const testCase of testCases) {
        subscriptionService.generateSubscriptionContent.mockResolvedValue(
          buildSubscriptionData(mockContent)
        );
        filterSnellNodes.mockReturnValue(mockContent);
        convertMock.mockResolvedValue('converted content');
        safeBase64Encode.mockReturnValue('encoded content');

        const url = testCase.format ? `/${path}?format=${testCase.format}` : `/${path}`;
        const response = await request(app).get(url).expect(200);

        expect(response.headers['content-type']).toBe(testCase.expectedType);
      }
    });
  });
});
