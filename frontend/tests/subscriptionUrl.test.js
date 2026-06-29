import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSubscriptionOrigin, getSubscriptionUrl } from '../src/utils/subscriptionUrl.js';

describe('subscriptionUrl', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses window origin in production', () => {
    vi.stubEnv('PROD', true);
    expect(getSubscriptionOrigin()).toBe(window.location.origin);
  });

  it('builds origin from VITE_BACKEND_PORT in dev', () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_BACKEND_PORT', '5100');
    const origin = getSubscriptionOrigin();
    expect(origin).toMatch(/^https?:\/\/[^:]+:5100$/);
  });

  it('throws in dev when VITE_BACKEND_PORT is missing', () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_BACKEND_PORT', '');
    expect(() => getSubscriptionOrigin()).toThrow(/VITE_BACKEND_PORT/);
  });

  it('joins a path onto the origin', () => {
    vi.stubEnv('PROD', true);
    expect(getSubscriptionUrl('my-sub')).toBe(`${window.location.origin}/my-sub`);
    expect(getSubscriptionUrl('/my-sub/clash')).toBe(`${window.location.origin}/my-sub/clash`);
  });
});
