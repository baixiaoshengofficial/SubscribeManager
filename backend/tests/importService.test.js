const { importNodes, normalizeImportUrls, resolveImportSources } = require('../services/importService');
const ApiError = require('../utils/ApiError');

describe('ImportService URL normalization', () => {
  it('accepts multiple subscription URLs from an array', () => {
    expect(normalizeImportUrls([
      ' https://provider.example.com/a ',
      'https://provider.example.com/b',
      'https://provider.example.com/a'
    ])).toEqual([
      'https://provider.example.com/a',
      'https://provider.example.com/b'
    ]);
  });

  it('accepts multiple subscription URLs from newline text', () => {
    expect(normalizeImportUrls('https://provider.example.com/a\n\nhttps://provider.example.com/b')).toEqual([
      'https://provider.example.com/a',
      'https://provider.example.com/b'
    ]);
  });

  it('rejects an empty URL list', () => {
    expect(() => normalizeImportUrls('\n  \n')).toThrow(ApiError);
  });

  it('rejects invalid URLs', () => {
    expect(() => normalizeImportUrls(['https://provider.example.com/a', 'not-a-url'])).toThrow(ApiError);
    expect(() => normalizeImportUrls(['file:///tmp/subscription'])).toThrow(ApiError);
  });

  it('creates readable source names without retaining credentials in query parameters', () => {
    expect(resolveImportSources([
      'https://www.provider.example.com/sub/a?token=1',
      'https://provider.example.com/sub/b?token=2',
      'https://another.example.com/api'
    ])).toEqual([
      {
        url: 'https://www.provider.example.com/sub/a?token=1',
        sourceName: 'provider.example.com',
        sourceUrl: 'https://www.provider.example.com/sub/a'
      },
      {
        url: 'https://provider.example.com/sub/b?token=2',
        sourceName: 'provider.example.com',
        sourceUrl: 'https://provider.example.com/sub/b'
      },
      {
        url: 'https://another.example.com/api',
        sourceName: 'another.example.com',
        sourceUrl: 'https://another.example.com/api'
      }
    ]);
  });

  it('decodes internationalized provider domains for display', () => {
    expect(resolveImportSources(['https://xn--fiqs8s.example/sub'])[0].sourceName).toBe('中国.example');
  });
});

describe('ImportService node import', () => {
  it('imports multiple subscription sources and records source failures', async () => {
    const mockNodeRepository = {
      findBySubscriptionPath: jest.fn().mockResolvedValue([{ id: 5, name: 'Existing' }]),
      create: jest.fn().mockResolvedValue({}),
      updateSource: jest.fn().mockResolvedValue({}),
      countBySubscriptionPath: jest.fn().mockResolvedValue(3)
    };
    const mockSubscriptionService = {
      getSubscription: jest.fn().mockResolvedValue({ id: 7 })
    };
    const mockFetchSubscriptionContent = jest.fn(async (url) => {
      if (url.endsWith('/broken')) {
        throw new Error('HTTP 500');
      }
      if (url.endsWith('/one')) {
        return [
          'ss://alpha.example.com:8388#Alpha',
          'ss://existing.example.com:8388#Existing'
        ].join('\n');
      }
      return 'ss://beta.example.com:8388#Beta';
    });

    const result = await importNodes('demo', [
      'http://provider.example.com/one',
      'http://provider.example.com/broken',
      'http://provider.example.com/two'
    ], {
      fetchSubscriptionContent: mockFetchSubscriptionContent,
      nodeRepository: mockNodeRepository,
      subscriptionService: mockSubscriptionService
    });

    expect(result).toEqual({
      importedCount: 2,
      updatedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      sourceCount: 3,
      failedSourceCount: 1,
      totalAfterImport: 3
    });
    expect(mockNodeRepository.updateSource).toHaveBeenCalledWith(
      5,
      'provider.example.com',
      'http://provider.example.com/one'
    );
    expect(mockNodeRepository.create).toHaveBeenCalledTimes(2);
    expect(mockNodeRepository.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      subscriptionId: 7,
      name: 'Alpha',
      originalLink: 'ss://alpha.example.com:8388#Alpha',
      type: 'ss',
      sourceName: 'provider.example.com',
      sourceUrl: 'http://provider.example.com/one'
    }));
    expect(mockNodeRepository.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      subscriptionId: 7,
      name: 'Beta',
      originalLink: 'ss://beta.example.com:8388#Beta',
      type: 'ss',
      sourceName: 'provider.example.com',
      sourceUrl: 'http://provider.example.com/two'
    }));
  });

  it('allows the same node name from different subscription sources', async () => {
    const mockNodeRepository = {
      findBySubscriptionPath: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
      updateSource: jest.fn().mockResolvedValue({}),
      countBySubscriptionPath: jest.fn().mockResolvedValue(2)
    };
    const mockSubscriptionService = {
      getSubscription: jest.fn().mockResolvedValue({ id: 9 })
    };
    const mockFetchSubscriptionContent = jest.fn(async (url) => {
      if (url.includes('airport-a.example.com')) {
        return 'ss://a.example.com:8388#Hong Kong 01';
      }
      return 'ss://b.example.com:8388#Hong Kong 01';
    });

    const result = await importNodes('demo', [
      'https://airport-a.example.com/sub',
      'https://airport-b.example.com/sub'
    ], {
      fetchSubscriptionContent: mockFetchSubscriptionContent,
      nodeRepository: mockNodeRepository,
      subscriptionService: mockSubscriptionService
    });

    expect(result.importedCount).toBe(2);
    expect(result.skippedCount).toBe(0);
    expect(mockNodeRepository.create).toHaveBeenCalledTimes(2);
    expect(mockNodeRepository.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      name: 'Hong Kong 01',
      sourceName: 'airport-a.example.com',
      sourceUrl: 'https://airport-a.example.com/sub'
    }));
    expect(mockNodeRepository.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      name: 'Hong Kong 01',
      sourceName: 'airport-b.example.com',
      sourceUrl: 'https://airport-b.example.com/sub'
    }));
  });

  it('normalizes source metadata on nodes imported before source grouping was fixed', async () => {
    const mockNodeRepository = {
      findBySubscriptionPath: jest.fn().mockResolvedValue([{
        id: 12,
        name: 'Tokyo 01',
        source_name: 'xn--fiqs8s.example/sub',
        source_url: 'https://xn--fiqs8s.example/sub?token=old-secret'
      }]),
      create: jest.fn(),
      updateSource: jest.fn().mockResolvedValue({}),
      countBySubscriptionPath: jest.fn().mockResolvedValue(1)
    };

    const result = await importNodes('demo', 'https://xn--fiqs8s.example/sub?token=new-secret', {
      fetchSubscriptionContent: jest.fn().mockResolvedValue('ss://tokyo.example.com:8388#Tokyo 01'),
      nodeRepository: mockNodeRepository,
      subscriptionService: { getSubscription: jest.fn().mockResolvedValue({ id: 11 }) }
    });

    expect(result.updatedCount).toBe(1);
    expect(result.importedCount).toBe(0);
    expect(mockNodeRepository.create).not.toHaveBeenCalled();
    expect(mockNodeRepository.updateSource).toHaveBeenCalledWith(
      12,
      '中国.example',
      'https://xn--fiqs8s.example/sub'
    );
  });
});
