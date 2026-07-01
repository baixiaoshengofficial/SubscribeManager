import { describe, it, expect } from 'vitest';
import {
  isValidNodeLink,
  getNodeType,
  extractNodeName,
  safeBase64Decode,
  parseNodeContent,
} from '../src/utils/nodeParser.js';

describe('isValidNodeLink', () => {
  it('accepts common protocol links', () => {
    expect(isValidNodeLink('ss://abc')).toBe(true);
    expect(isValidNodeLink('VMESS://abc')).toBe(true);
    expect(isValidNodeLink('vless://abc')).toBe(true);
    expect(isValidNodeLink('trojan://abc')).toBe(true);
    expect(isValidNodeLink('hysteria2://abc')).toBe(true);
    expect(isValidNodeLink('tuic://abc')).toBe(true);
  });

  it('accepts legacy snell line', () => {
    expect(isValidNodeLink('MyNode = snell, 1.2.3.4, 443, psk=xxx')).toBe(true);
  });

  it('rejects invalid input', () => {
    expect(isValidNodeLink('')).toBe(false);
    expect(isValidNodeLink(null)).toBe(false);
    expect(isValidNodeLink('http://example.com')).toBe(false);
  });
});

describe('getNodeType', () => {
  it('returns lowercase type from prefix', () => {
    expect(getNodeType('ss://abc')).toBe('ss');
    expect(getNodeType('VLESS://abc')).toBe('vless');
    expect(getNodeType('hysteria2://abc')).toBe('hysteria2');
  });

  it('detects snell from legacy line', () => {
    expect(getNodeType('Node = snell, host, 443')).toBe('snell');
  });

  it('returns empty string for unknown', () => {
    expect(getNodeType('unknown')).toBe('unknown');
    expect(getNodeType('')).toBe('unknown');
  });
});

describe('safeBase64Decode', () => {
  it('decodes standard base64', () => {
    expect(safeBase64Decode('SGVsbG8gV29ybGQ=')).toBe('Hello World');
  });

  it('decodes url-safe base64 without padding', () => {
    // "ss://" base64-url
    expect(safeBase64Decode('c3M6Ly8')).toBe('ss://');
  });

  it('returns empty string for falsy input', () => {
    expect(safeBase64Decode('')).toBe('');
    expect(safeBase64Decode(null)).toBe('');
  });
});

describe('extractNodeName', () => {
  it('extracts from hash fragment', () => {
    expect(extractNodeName('ss://server#MyNode')).toBe('MyNode');
  });

  it('decodes percent-encoded fragment', () => {
    expect(extractNodeName('ss://server#%E8%8A%82%E7%82%B9')).toBe('节点');
  });

  it('extracts vmess ps field', () => {
    const cfg = btoa(JSON.stringify({ ps: 'VmessNode', add: '1.2.3.4' }));
    expect(extractNodeName(`vmess://${cfg}`)).toBe('VmessNode');
  });

  it('extracts snell name before equals', () => {
    expect(extractNodeName('SnellNode = snell, host, 443')).toBe('SnellNode');
  });

  it('returns default for empty input', () => {
    expect(extractNodeName('')).toBe('未命名节点');
  });
});

describe('parseNodeContent', () => {
  it('parses plain multi-line node list', () => {
    const raw = 'ss://server1#A\nvless://server2#B\n\nnot-a-node';
    const nodes = parseNodeContent(raw);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toEqual({ name: 'A', content: 'ss://server1#A' });
    expect(nodes[1].content).toBe('vless://server2#B');
  });

  it('decodes a base64-wrapped subscription', () => {
    const inner = 'ss://server1#A\nvless://server2#B';
    const raw = btoa(inner);
    const nodes = parseNodeContent(raw);
    expect(nodes).toHaveLength(2);
  });

  it('applies fallback name when provided', () => {
    const nodes = parseNodeContent('ss://server1#A', 'Fixed');
    expect(nodes[0].name).toBe('Fixed');
  });
});
