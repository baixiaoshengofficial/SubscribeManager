const {
  formatNodesForSubconvertUrl,
  resolveSubconvertDirectUrl,
} = require('../utils/converters/urlHandler');

describe('urlHandler subconverter url', () => {
  it('inlines node content when available', () => {
    const nodes = 'ss://a#1\nvmess://b#2';
    expect(resolveSubconvertDirectUrl('https://sub.example.com/my-sub', nodes)).toBe(
      'ss://a#1|vmess://b#2'
    );
  });

  it('falls back to subscription URL when nodes are empty', () => {
    expect(resolveSubconvertDirectUrl('https://sub.example.com/my-sub', '')).toBe(
      'https://sub.example.com/my-sub'
    );
  });

  it('joins multiple lines with pipe for subconverter', () => {
    expect(formatNodesForSubconvertUrl('a\n\nb\n')).toBe('a|b');
  });
});
