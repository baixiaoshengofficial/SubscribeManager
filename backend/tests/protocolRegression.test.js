const yaml = require('js-yaml');
const { ProtocolFactory } = require('../protocols/ProtocolFactory');
const { convertSubscription } = require('../utils/converters/subscriptionConverter');
const { parseSubscriptionNodes } = require('../utils/converters/subscriptionParser');

const UUID = '00000000-0000-4000-8000-000000000001';
const REALITY_PUBLIC_KEY = 'SYNTHETIC_PUBLIC_KEY_FOR_REGRESSION';
const REALITY_SHORT_ID = '0123456789abcdef';

function encodeVmess(config) {
  return `vmess://${Buffer.from(JSON.stringify(config)).toString('base64')}`;
}

function encodeSs(method, password, server, port, name) {
  const auth = Buffer.from(`${method}:${password}`).toString('base64');
  return `ss://${auth}@${server}:${port}#${encodeURIComponent(name)}`;
}

const fixtures = {
  ss: encodeSs('aes-256-gcm', 'ss:secret', 'ss.example.com', 8388, 'SS Node'),
  vmessWs: encodeVmess({
    v: '2',
    ps: 'VMess WS',
    add: 'vmess.example.com',
    port: '443',
    id: UUID,
    aid: '0',
    scy: 'auto',
    net: 'ws',
    host: 'cdn.example.com',
    path: '/socket',
    tls: 'tls',
    sni: 'edge.example.com',
    alpn: 'h2,http/1.1',
    fp: 'chrome'
  }),
  vlessReality: `vless://${UUID}@reality.example.com:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.example.com&fp=chrome&pbk=${REALITY_PUBLIC_KEY}&sid=${REALITY_SHORT_ID}&type=tcp&headerType=none&packetEncoding=xudp#VLESS%20Reality`,
  vlessWs: `vless://${UUID}@vless-ws.example.com:8443?encryption=none&security=tls&sni=cdn.example.com&type=ws&host=host.example.com&path=%2Fws&ed=2048&early-data-header-name=Sec-WebSocket-Protocol#VLESS%20WS`,
  trojanWs: 'trojan://trojan-secret@trojan.example.com:443?type=ws&path=%2Ftrojan&host=ws.example.com&sni=tls.example.com&alpn=h2%2Chttp%2F1.1&fp=chrome&allowInsecure=0#Trojan%20WS',
  hysteria2: 'hysteria2://hy2-secret@hy2.example.com:443?upmbps=30&downmbps=200&sni=hy2-tls.example.com&alpn=h3&obfs=salamander&obfs-password=obfs-secret&insecure=0#Hysteria2',
  hysteria2Alias: 'hy2://alias-secret@hy2-alias.example.com:8443?sni=alias.example.com#HY2%20Alias',
  tuic: `tuic://${UUID}:tuic-secret@tuic.example.com:10443?sni=tuic-tls.example.com&alpn=h3&udp_relay_mode=native&congestion_control=bbr&disable_sni=1&reduce_rtt=1&allowInsecure=0#TUIC`,
  anytls: 'anytls://anytls%3Asecret@anytls.example.com:8443/?sni=anytls-tls.example.com&insecure=0&alpn=h2%2Chttp%2F1.1&fp=chrome&idleSessionCheckInterval=20&idleSessionTimeout=60&minIdleSession=0#AnyTLS%20Node',
  socks: 'socks://proxy-user:proxy-pass@socks.example.com:1080#SOCKS5'
};

function parseClashProxy(proxy) {
  const factory = new ProtocolFactory();
  const node = factory.parseNode(proxy);
  return factory.convertNodeFormat(node, 'clash');
}

describe('Protocol regression matrix', () => {
  it('recognizes every protocol exposed by the protocol factory', () => {
    const factory = new ProtocolFactory();

    expect(Object.values(fixtures).map(link => factory.parseNode(link))).not.toContain(null);
    expect(factory.parseNode('unknown://example.com:443')).toBeNull();
  });

  it('preserves Shadowsocks and SOCKS authentication in Clash output', () => {
    expect(parseClashProxy(fixtures.ss)).toMatchObject({
      type: 'ss',
      server: 'ss.example.com',
      port: 8388,
      cipher: 'aes-256-gcm',
      password: 'ss:secret'
    });
    expect(parseClashProxy(fixtures.socks)).toMatchObject({
      type: 'socks5',
      server: 'socks.example.com',
      port: 1080,
      username: 'proxy-user',
      password: 'proxy-pass'
    });
  });

  it('preserves VMess WebSocket, TLS, SNI, ALPN and fingerprint fields', () => {
    expect(parseClashProxy(fixtures.vmessWs)).toMatchObject({
      type: 'vmess',
      udp: true,
      network: 'ws',
      tls: true,
      'skip-cert-verify': false,
      servername: 'edge.example.com',
      alpn: ['h2', 'http/1.1'],
      'client-fingerprint': 'chrome',
      'ws-opts': {
        path: '/socket',
        headers: { Host: 'cdn.example.com' }
      }
    });
  });

  it('generates a Mihomo-compatible VLESS Reality node without misplaced fields', () => {
    const proxy = parseClashProxy(fixtures.vlessReality);

    expect(proxy).toMatchObject({
      type: 'vless',
      udp: true,
      encryption: '',
      network: 'tcp',
      flow: 'xtls-rprx-vision',
      'packet-encoding': 'xudp',
      tls: true,
      servername: 'www.example.com',
      'client-fingerprint': 'chrome',
      'reality-opts': {
        'public-key': REALITY_PUBLIC_KEY,
        'short-id': REALITY_SHORT_ID
      }
    });
    expect(proxy).not.toHaveProperty('cipher');
    expect(proxy['reality-opts']).not.toHaveProperty('sni');
    expect(proxy['reality-opts']).not.toHaveProperty('fingerprint');
  });

  it('preserves VLESS WebSocket early-data options', () => {
    expect(parseClashProxy(fixtures.vlessWs)).toMatchObject({
      type: 'vless',
      network: 'ws',
      tls: true,
      servername: 'cdn.example.com',
      'ws-opts': {
        path: '/ws',
        headers: { Host: 'host.example.com' },
        'max-early-data': 2048,
        'early-data-header-name': 'Sec-WebSocket-Protocol'
      }
    });
  });

  it('preserves Trojan WebSocket and TLS client options', () => {
    expect(parseClashProxy(fixtures.trojanWs)).toMatchObject({
      type: 'trojan',
      udp: true,
      network: 'ws',
      sni: 'tls.example.com',
      alpn: ['h2', 'http/1.1'],
      'client-fingerprint': 'chrome',
      'skip-cert-verify': false,
      'ws-opts': {
        path: '/trojan',
        headers: { Host: 'ws.example.com' }
      }
    });
  });

  it('preserves Hysteria2 bandwidth, TLS and obfuscation fields', () => {
    expect(parseClashProxy(fixtures.hysteria2)).toMatchObject({
      type: 'hysteria2',
      password: 'hy2-secret',
      up: '30',
      down: '200',
      sni: 'hy2-tls.example.com',
      alpn: ['h3'],
      obfs: 'salamander',
      'obfs-password': 'obfs-secret',
      'skip-cert-verify': false
    });
    expect(parseClashProxy(fixtures.hysteria2Alias)).toMatchObject({
      type: 'hysteria2',
      server: 'hy2-alias.example.com',
      port: 8443
    });
  });

  it('preserves TUIC v5 transport and TLS fields using Mihomo field names', () => {
    const proxy = parseClashProxy(fixtures.tuic);

    expect(proxy).toMatchObject({
      type: 'tuic',
      uuid: UUID,
      password: 'tuic-secret',
      sni: 'tuic-tls.example.com',
      alpn: ['h3'],
      'udp-relay-mode': 'native',
      'congestion-controller': 'bbr',
      'disable-sni': true,
      'reduce-rtt': true,
      'skip-cert-verify': false
    });
    expect(proxy).not.toHaveProperty('congestion-control');
    expect(proxy).not.toHaveProperty('version');
  });

  it('preserves AnyTLS authentication, TLS and idle-session fields', () => {
    expect(parseClashProxy(fixtures.anytls)).toMatchObject({
      type: 'anytls',
      server: 'anytls.example.com',
      port: 8443,
      password: 'anytls:secret',
      udp: true,
      sni: 'anytls-tls.example.com',
      alpn: ['h2', 'http/1.1'],
      'client-fingerprint': 'chrome',
      'skip-cert-verify': false,
      'idle-session-check-interval': 20,
      'idle-session-timeout': 60,
      'min-idle-session': 0
    });
    expect(parseClashProxy('anytls://default-password@default-port.example.com#Default')).toMatchObject({
      port: 443,
      password: 'default-password'
    });
  });

  it('keeps every supported protocol and critical field in generated YAML', async () => {
    const output = await convertSubscription(
      [
        fixtures.ss,
        fixtures.vmessWs,
        fixtures.vlessReality,
        fixtures.vlessWs,
        fixtures.trojanWs,
        fixtures.hysteria2,
        fixtures.tuic,
        fixtures.anytls,
        fixtures.socks
      ].join('\n'),
      'clash',
      'proxies:\n{{proxies}}\n'
    );
    const config = yaml.load(output);
    const proxiesByName = Object.fromEntries(config.proxies.map(proxy => [proxy.name, proxy]));

    expect(config.proxies).toHaveLength(9);
    expect(proxiesByName['VLESS Reality']['reality-opts']).toEqual({
      'public-key': REALITY_PUBLIC_KEY,
      'short-id': REALITY_SHORT_ID
    });
    expect(proxiesByName['VMess WS'].alpn).toEqual(['h2', 'http/1.1']);
    expect(proxiesByName.Hysteria2).toMatchObject({ up: '30', down: '200', alpn: ['h3'] });
    expect(proxiesByName.TUIC['congestion-controller']).toBe('bbr');
    expect(proxiesByName['AnyTLS Node']).toMatchObject({
      type: 'anytls',
      'idle-session-check-interval': 20,
      'client-fingerprint': 'chrome'
    });
    expect(proxiesByName.SOCKS5).toMatchObject({ type: 'socks5', username: 'proxy-user' });
  });

  it.each([
    ['Shadowsocks', fixtures.ss, ['clash', 'surge', 'shadowsocks', 'universal'], []],
    ['VMess', fixtures.vmessWs, ['clash', 'surge', 'universal'], ['shadowsocks']],
    ['VLESS', fixtures.vlessReality, ['clash', 'universal'], ['surge', 'shadowsocks']],
    ['Trojan', fixtures.trojanWs, ['clash', 'surge', 'universal'], ['shadowsocks']],
    ['SOCKS', fixtures.socks, ['clash', 'surge', 'universal'], ['shadowsocks']],
    ['Hysteria2', fixtures.hysteria2, ['clash', 'surge', 'universal'], ['shadowsocks']],
    ['TUIC', fixtures.tuic, ['clash', 'surge', 'universal'], ['shadowsocks']],
    ['AnyTLS', fixtures.anytls, ['clash', 'surge', 'universal'], ['shadowsocks']]
  ])('enforces the %s output-format contract', (_name, link, supported, unsupported) => {
    const factory = new ProtocolFactory();
    const node = factory.parseNode(link);

    for (const format of supported) {
      expect(factory.convertNodeFormat(node, format)).not.toBeNull();
    }
    for (const format of unsupported) {
      expect(factory.convertNodeFormat(node, format)).toBeNull();
    }
  });

  it.each([
    ['VLESS Reality', fixtures.vlessReality, ['flow', 'sni', 'fp', 'pbk', 'sid', 'packetEncoding']],
    ['Hysteria2', fixtures.hysteria2, ['up', 'down', 'sni', 'alpn', 'obfs', 'obfsPassword']],
    ['TUIC', fixtures.tuic, ['sni', 'alpn', 'udpRelayMode', 'congestionControl', 'disableSni', 'reduceRtt']],
    ['AnyTLS', fixtures.anytls, ['sni', 'alpn', 'fingerprint', 'idleSessionCheckInterval', 'idleSessionTimeout', 'minIdleSession']]
  ])('retains %s fields after Clash-to-URI round trip', (_name, link, fields) => {
    const factory = new ProtocolFactory();
    const original = factory.parseNode(link);
    const clash = factory.convertNodeFormat(original, 'clash');
    const universal = factory.convertNodeFormat({ ...clash, type: original.type }, 'universal');
    const reparsed = factory.parseNode(universal);

    for (const field of fields) {
      expect(reparsed[field]).toEqual(original[field]);
    }
  });

  it('imports AnyTLS nodes from Mihomo YAML subscriptions', async () => {
    const nodes = await parseSubscriptionNodes(`proxies:
  - name: AnyTLS from YAML
    type: anytls
    server: anytls.example.com
    port: 443
    password: yaml-secret
    sni: tls.example.com
    alpn: [h2, http/1.1]
    skip-cert-verify: false
    idle-session-check-interval: 30`);

    expect(nodes).toEqual([
      expect.stringContaining('anytls://yaml-secret@anytls.example.com:443/')
    ]);
    expect(nodes[0]).toContain('idleSessionCheckInterval=30');
  });

  it('converts AnyTLS to and from Surge proxy declarations', async () => {
    const factory = new ProtocolFactory();
    const surge = factory.convertNodeFormat(factory.parseNode(fixtures.anytls), 'surge');

    expect(surge).toContain('AnyTLS Node = anytls, anytls.example.com, 8443');
    expect(surge).toContain('password=anytls:secret');
    expect(surge).toContain('skip-cert-verify=false');
    expect(surge).toContain('sni=anytls-tls.example.com');

    const nodes = await parseSubscriptionNodes(`[Proxy]\nSurge AnyTLS = anytls, surge-anytls.example.com, 443, password=surge-secret, skip-cert-verify=true, sni=tls.example.com, reuse=false`);
    expect(nodes).toEqual([
      expect.stringContaining('anytls://surge-secret@surge-anytls.example.com:443/')
    ]);
    expect(nodes[0]).toContain('insecure=1');
    expect(nodes[0]).toContain('reuse=false');
  });
});
