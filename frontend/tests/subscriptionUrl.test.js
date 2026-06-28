import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSubscriptionOrigin, getSubscriptionUrl } from '../src/utils/subscriptionUrl.js';

describe('subscriptionUrl', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    // jsdom default origin is http://localhost:3000
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses VITE_BACKEND_ORIGIN when configured', () => {
    vi.stubEnv('VITE_BACKEND_ORIGIN', 'https://sub.example.com/');
    expect(getSubscriptionOrigin()).toBe('https://sub.example.com');
  });

  it('builds origin from VITE_BACKEND_PORT in dev', () => {
    vi.stubEnv('VITE_BACKEND_ORIGIN', '');
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_BACKEND_PORT', '5100');
    const origin = getSubscriptionOrigin();
    expect(origin).toMatch(/^https?:\/\/[^:]+:5100$/);
  });

  it('throws in dev when VITE_BACKEND_PORT is missing', () => {
    vi.stubEnv('VITE_BACKEND_ORIGIN', '');
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_BACKEND_PORT', '');
    expect(() => getSubscriptionOrigin()).toThrow(/VITE_BACKEND_PORT/);
  });

  it('uses window origin in production', () => {
    vi.stubEnv('VITE_BACKEND_ORIGIN', '');
    vi.stubEnv('PROD', true);
    expect(getSubscriptionOrigin()).toBe(window.location.origin);
  });

  it('joins a path onto the origin', () => {
    vi.stubEnv('VITE_BACKEND_ORIGIN', 'https://sub.example.com');
    expect(getSubscriptionUrl('my-sub')).toBe('https://sub.example.com/my-sub');
    expect(getSubscriptionUrl('/my-sub')).toBe('https://sub.example.com/my-sub');
  });
});
