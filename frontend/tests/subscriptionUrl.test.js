import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSubscriptionOrigin, getSubscriptionUrl } from '../src/utils/subscriptionUrl.js';

describe('subscriptionUrl', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('always uses window.location.origin', () => {
    expect(getSubscriptionOrigin()).toBe(window.location.origin);
  });

  it('joins a path onto the origin', () => {
    expect(getSubscriptionUrl('prosubscribe')).toBe(`${window.location.origin}/prosubscribe`);
    expect(getSubscriptionUrl('/prosubscribe/clash')).toBe(`${window.location.origin}/prosubscribe/clash`);
  });
});
