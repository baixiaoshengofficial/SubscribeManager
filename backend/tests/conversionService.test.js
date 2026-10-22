jest.mock('../services/subscriptionService', () => ({
  generateSubscriptionContent: jest.fn()
}));

jest.mock('../utils/httpClient', () => ({
  fetchUrl: jest.fn()
}));

const { ConversionService } = require('../services/conversionService');
const subscriptionService = require('../services/subscriptionService');
const { fetchUrl } = require('../utils/httpClient');

describe('ConversionService', () => {
  const originalPublicBaseUrl = process.env.PUBLIC_BASE_URL;

  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.PUBLIC_BASE_URL;
    fetchUrl.mockResolvedValue('proxies: []');
  });

  afterEach(() => {
    if (originalPublicBaseUrl === undefined) {
      delete process.env.PUBLIC_BASE_URL;
    } else {
      process.env.PUBLIC_BASE_URL = originalPublicBaseUrl;
    }
  });

  describe('generateClashPreview', () => {
    it('builds a Subconvert request from subscription nodes', async () => {
      subscriptionService.generateSubscriptionContent.mockResolvedValue({
        nodes: 'ss://node-a#A\nlegacy=snell,host,443,pwd',
        config: {}
      });

      const result = await new ConversionService().generateClashPreview({
        subconvertUrl: 'https://sub.example.com/sub',
        templateUrl: 'https://github.com/org/repo/blob/main/template.ini',
        subscriptionPath: 'demo-sub',
        requestBaseUrl: 'https://manager.example.com'
      });

      expect(result).toEqual({
        config: 'proxies: []',
        length: 'proxies: []'.length
      });
      expect(subscriptionService.generateSubscriptionContent).toHaveBeenCalledWith('demo-sub');

      const requestUrl = new URL(fetchUrl.mock.calls[0][0]);
      expect(requestUrl.origin + requestUrl.pathname).toBe('https://sub.example.com/sub');
      expect(requestUrl.searchParams.get('target')).toBe('clash');
      expect(requestUrl.searchParams.get('url')).toBe('ss://node-a#A');
      expect(requestUrl.searchParams.get('config')).toBe(
        'https://raw.githubusercontent.com/org/repo/main/template.ini'
      );
    });

    it('falls back to the public subscription URL when there are no nodes', async () => {
      subscriptionService.generateSubscriptionContent.mockResolvedValue({
        nodes: '',
        config: {}
      });

      await new ConversionService().generateClashPreview({
        subconvertUrl: 'https://sub.example.com/sub',
        subscriptionPath: 'empty-sub',
        requestBaseUrl: 'https://manager.example.com'
      });

      const requestUrl = new URL(fetchUrl.mock.calls[0][0]);
      expect(requestUrl.searchParams.get('url')).toBe('https://manager.example.com/empty-sub/v2ray');
    });

    it('throws when the subscription does not exist', async () => {
      subscriptionService.generateSubscriptionContent.mockResolvedValue(null);

      await expect(new ConversionService().generateClashPreview({
        subconvertUrl: 'https://sub.example.com/sub',
        subscriptionPath: 'missing-sub',
        requestBaseUrl: 'https://manager.example.com'
      })).rejects.toMatchObject({
        statusCode: 404,
        message: 'subscription.not_found'
      });
    });
  });

  describe('large subscriptions and Subconverter errors', () => {
    const templateUrl = 'https://raw.githubusercontent.com/jokerknight/rules/refs/heads/main/baixiaosheng.ini';
    // 中文节点名称在 URL 编码后占用更多空间。
    const nodes = Array.from({ length: 80 }, (_, i) => `ss://node-${i}#香港节点-${i}`).join('\n');
    const config = 'proxies: []\nproxy-groups:\n  - name: 香港节点\n  - name: 其他地区\n';
    const preview = (content = nodes, subconvertUrl = 'https://sub.example.com') => {
      subscriptionService.generateSubscriptionContent.mockResolvedValue({ nodes: content, config: {} });
      return new ConversionService().generateClashPreview({
        subconvertUrl,
        templateUrl,
        subscriptionPath: 'demo-sub',
        requestBaseUrl: 'https://manager.example.com'
      });
    };
    const convert = () => new ConversionService().convert(nodes, 'clash', {
      subconvertUrl: 'https://sub.example.com',
      customTemplate: templateUrl,
      subscriptionUrl: 'https://manager.example.com/demo-sub/clash',
      realBaseUrl: 'https://manager.example.com'
    });

    it.each(['preview', 'subscription'])('uses a short Base64 source URL for a large %s and keeps the custom template', async (operation) => {
      fetchUrl.mockResolvedValue(config);

      const result = await (operation === 'preview' ? preview() : convert());

      expect(operation === 'preview' ? result.config : result).toBe(config);
      expect(fetchUrl).toHaveBeenCalledTimes(1);
      const requestUrl = new URL(fetchUrl.mock.calls[0][0]);
      expect(Buffer.byteLength(requestUrl.href)).toBeLessThanOrEqual(4096);
      expect(requestUrl.searchParams.get('url')).toBe('https://manager.example.com/demo-sub/v2ray');
      expect(requestUrl.searchParams.get('target')).toBe('clash');
      expect(requestUrl.searchParams.get('config')).toBe(templateUrl);
    });

    it('uses PUBLIC_BASE_URL when Subconverter needs a public address', async () => {
      process.env.PUBLIC_BASE_URL = 'https://public.example.com/';
      await preview();

      const requestUrl = new URL(fetchUrl.mock.calls[0][0]);
      expect(requestUrl.searchParams.get('url')).toBe('https://public.example.com/demo-sub/v2ray');
    });

    it('uses the subscription origin when no request base URL is provided', async () => {
      await new ConversionService().convert(nodes, 'clash', {
        subconvertUrl: 'https://sub.example.com',
        customTemplate: templateUrl,
        subscriptionUrl: 'https://manager.example.com/demo-sub/clash'
      });

      const requestUrl = new URL(fetchUrl.mock.calls[0][0]);
      expect(requestUrl.searchParams.get('url')).toBe('https://manager.example.com/demo-sub/v2ray');
    });

    it('retries a smaller inline request on HTTP 414 without changing conversion options', async () => {
      fetchUrl.mockRejectedValueOnce(Object.assign(new Error('HTTP 414'), { statusCode: 414 }));
      fetchUrl.mockResolvedValueOnce(config);

      const result = await preview('ss://node-a#香港\nss://node-b#日本', 'https://sub.example.com/sub?emoji=false&udp=true');

      expect(result.config).toBe(config);
      expect(fetchUrl).toHaveBeenCalledTimes(2);
      const first = new URL(fetchUrl.mock.calls[0][0]);
      const retry = new URL(fetchUrl.mock.calls[1][0]);
      expect(first.searchParams.get('url')).toBe('ss://node-a#香港|ss://node-b#日本');
      expect(retry.searchParams.get('url')).toBe('https://manager.example.com/demo-sub/v2ray');
      first.searchParams.delete('url');
      retry.searchParams.delete('url');
      expect(retry.href).toBe(first.href);
    });

    it('does not retry the same source URL after HTTP 414', async () => {
      const error = Object.assign(new Error('HTTP 414'), { statusCode: 414 });
      fetchUrl.mockRejectedValue(error);

      await expect(preview()).rejects.toBe(error);
      expect(fetchUrl).toHaveBeenCalledTimes(1);
    });

    it('does not replace failed custom Clash conversion with the built-in template', async () => {
      const error = Object.assign(new Error('HTTP 502'), { statusCode: 502 });
      fetchUrl.mockRejectedValue(error);

      await expect(convert()).rejects.toBe(error);
      expect(fetchUrl).toHaveBeenCalledTimes(1);
    });
  });
});
