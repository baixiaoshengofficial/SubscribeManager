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
  beforeEach(() => {
    jest.resetAllMocks();
    fetchUrl.mockResolvedValue('proxies: []');
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
      expect(requestUrl.searchParams.get('url')).toBe('https://manager.example.com/empty-sub');
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
});
