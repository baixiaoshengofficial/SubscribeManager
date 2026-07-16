const BaseProtocol = require('./BaseProtocol');
const { safeDecodeURIComponent } = require('../utils/helpers');

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

class AnyTLSProtocol extends BaseProtocol {
  constructor() {
    super({
      prefix: 'anytls://',
      defaults: {
        name: '未命名节点'
      },
      transformers: {
        name: (name) => name ? safeDecodeURIComponent(name) : '未命名节点',
        port: (port) => parseInt(port),
        skipCertVerify: (insecure) => insecure === true || insecure === 'true' || insecure === '1',
        reuse: (reuse) => reuse === true || reuse === 'true' || reuse === '1'
      }
    });
  }

  extractElements(nodeLink) {
    const url = new URL(nodeLink);
    if (!url.hostname || !url.username) return null;

    const params = new URLSearchParams(url.search);
    const elements = {
      name: url.hash ? url.hash.substring(1) : null,
      server: url.hostname,
      port: url.port || '443',
      password: safeDecodeURIComponent(url.username),
      sni: params.get('sni'),
      alpn: params.get('alpn'),
      fingerprint: params.get('fp') || params.get('client-fingerprint'),
      skipCertVerify: params.get('insecure') || params.get('allowInsecure') || params.get('allow_insecure'),
      idleSessionCheckInterval: params.get('idleSessionCheckInterval') || params.get('idle-session-check-interval') || params.get('idle_session_check_interval'),
      idleSessionTimeout: params.get('idleSessionTimeout') || params.get('idle-session-timeout') || params.get('idle_session_timeout'),
      minIdleSession: params.get('minIdleSession') || params.get('min-idle-session') || params.get('min_idle_session')
    };

    if (params.has('reuse')) elements.reuse = params.get('reuse');
    if (params.has('server-cert-fingerprint-sha256')) {
      elements.serverCertFingerprint = params.get('server-cert-fingerprint-sha256');
    }
    return elements;
  }

  validateElements(elements) {
    return super.validateElements(elements) && Boolean(elements.password);
  }

  convertToFormat(node, targetFormat) {
    const format = targetFormat.toLowerCase();

    if (format === 'universal' && node.server && node.port && node.password) {
      return this.convertFromClash(node);
    }

    if (format === 'surge') {
      const parts = [
        `${node.name} = anytls`,
        node.server,
        node.port,
        `password=${node.password}`,
        `skip-cert-verify=${Boolean(node.skipCertVerify)}`
      ];

      if (node.sni) parts.push(`sni=${safeDecodeURIComponent(node.sni)}`);
      if (node.serverCertFingerprint) {
        parts.push(`server-cert-fingerprint-sha256=${node.serverCertFingerprint}`);
      }
      if (node.reuse !== undefined) parts.push(`reuse=${node.reuse}`);
      return parts.join(', ');
    }

    if (format !== 'clash') {
      return null;
    }

    const clashNode = {
      name: node.name,
      type: 'anytls',
      server: node.server,
      port: node.port,
      password: node.password,
      udp: true,
      'skip-cert-verify': Boolean(node.skipCertVerify)
    };

    if (node.sni) clashNode.sni = safeDecodeURIComponent(node.sni);
    if (node.alpn) clashNode.alpn = node.alpn.split(',').map(value => value.trim());
    if (node.fingerprint) clashNode['client-fingerprint'] = node.fingerprint;
    const idleSessionCheckInterval = parseOptionalNumber(node.idleSessionCheckInterval);
    const idleSessionTimeout = parseOptionalNumber(node.idleSessionTimeout);
    const minIdleSession = parseOptionalNumber(node.minIdleSession);
    if (idleSessionCheckInterval !== undefined) clashNode['idle-session-check-interval'] = idleSessionCheckInterval;
    if (idleSessionTimeout !== undefined) clashNode['idle-session-timeout'] = idleSessionTimeout;
    if (minIdleSession !== undefined) clashNode['min-idle-session'] = minIdleSession;

    return clashNode;
  }

  convertFromClash(proxy) {
    const {
      name,
      server,
      port,
      password,
      sni,
      alpn,
      fingerprint,
      'client-fingerprint': clientFingerprint,
      'skip-cert-verify': skipCertVerify,
      reuse,
      'server-cert-fingerprint-sha256': serverCertFingerprint,
      'idle-session-check-interval': idleSessionCheckInterval,
      'idle-session-timeout': idleSessionTimeout,
      'min-idle-session': minIdleSession
    } = proxy;

    const params = new URLSearchParams();
    if (sni) params.set('sni', sni);
    if (alpn) params.set('alpn', Array.isArray(alpn) ? alpn.join(',') : alpn);
    if (clientFingerprint || fingerprint) params.set('fp', clientFingerprint || fingerprint);
    if (skipCertVerify) params.set('insecure', '1');
    if (reuse !== undefined) params.set('reuse', reuse.toString());
    if (serverCertFingerprint) params.set('server-cert-fingerprint-sha256', serverCertFingerprint);
    if (idleSessionCheckInterval !== undefined) params.set('idleSessionCheckInterval', idleSessionCheckInterval.toString());
    if (idleSessionTimeout !== undefined) params.set('idleSessionTimeout', idleSessionTimeout.toString());
    if (minIdleSession !== undefined) params.set('minIdleSession', minIdleSession.toString());

    const host = server.includes(':') && !server.startsWith('[') ? `[${server}]` : server;
    const query = params.toString();
    const link = `anytls://${encodeURIComponent(password)}@${host}:${port}/${query ? `?${query}` : ''}`;
    return name ? `${link}#${encodeURIComponent(name)}` : link;
  }

  convertFromSurge(name, params) {
    const [, server, port, ...rest] = params;
    if (!server || !port) return null;

    const keyValues = rest.reduce((result, value) => {
      const separator = value.indexOf('=');
      if (separator !== -1) {
        result[value.substring(0, separator).trim()] = value.substring(separator + 1).trim();
      }
      return result;
    }, {});
    const password = keyValues.password || rest.find(value => !value.includes('='));
    if (!password) return null;

    return this.convertFromClash({
      name,
      server,
      port: parseInt(port),
      password,
      sni: keyValues.sni,
      'skip-cert-verify': keyValues['skip-cert-verify'] === 'true',
      reuse: keyValues.reuse,
      'server-cert-fingerprint-sha256': keyValues['server-cert-fingerprint-sha256']
    });
  }
}

module.exports = AnyTLSProtocol;
