/**
 * Clash 配置生成器测试
 */

const { EventEmitter } = require('events');
const https = require('https');
const { generateClashConfig, validateAndLoadTemplate } = require('../utils/converters/clashConfigGenerator');

jest.mock('https', () => ({
  request: jest.fn()
}));

function mockHttpsRequest({ statusCode = 200, body = '' }) {
  https.request.mockImplementation((options, callback) => {
    const res = new EventEmitter();
    res.statusCode = statusCode;

    process.nextTick(() => {
      callback(res);
      if (body) {
        res.emit('data', Buffer.from(body));
      }
      res.emit('end');
    });

    return {
      on: jest.fn(),
      setTimeout: jest.fn(),
      destroy: jest.fn(),
      end: jest.fn()
    };
  });
}

describe('Clash Config Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAndLoadTemplate', () => {
    it('应该能够加载模板内容', async () => {
      const templateUrl = 'https://example.com/template.yml';
      mockHttpsRequest({ statusCode: 200, body: 'template content' });

      const result = await validateAndLoadTemplate(templateUrl);

      expect(result).toBeDefined();
      expect(result.content).toBe('template content');
      expect(result.length).toBe('template content'.length);
    });

    it('应该拒绝无效的 URL', async () => {
      const templateUrl = 'not-a-valid-url';

      await expect(validateAndLoadTemplate(templateUrl)).rejects.toThrow();
    });
  });

  describe('generateClashConfig', () => {
    it('应该能够生成 Clash 配置', async () => {
      const subconvertApiUrl = 'https://subconvert.example.com/sub';
      mockHttpsRequest({ statusCode: 200, body: 'clash config content' });

      const config = await generateClashConfig(subconvertApiUrl);

      expect(config).toBeDefined();
      expect(typeof config).toBe('string');
      expect(config).toBe('clash config content');
    });

    it('应该拒绝无效的 Subconvert API URL', async () => {
      const subconvertApiUrl = 'not-a-valid-url';

      await expect(generateClashConfig(subconvertApiUrl)).rejects.toThrow();
    });
  });
});
