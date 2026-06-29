const { isSubscriptionRequestPath } = require('../utils/subscriptionPath');

describe('subscriptionPath', () => {
  it('accepts subscription paths', () => {
    expect(isSubscriptionRequestPath('/prosubscribe')).toBe(true);
    expect(isSubscriptionRequestPath('/prosubscribe/clash')).toBe(true);
    expect(isSubscriptionRequestPath('/my-sub/nodes')).toBe(true);
  });

  it('rejects static and app paths', () => {
    expect(isSubscriptionRequestPath('/')).toBe(false);
    expect(isSubscriptionRequestPath('/index.html')).toBe(false);
    expect(isSubscriptionRequestPath('/favicon.ico')).toBe(false);
    expect(isSubscriptionRequestPath('/api/auth/me')).toBe(false);
    expect(isSubscriptionRequestPath('/version')).toBe(false);
    expect(isSubscriptionRequestPath('/assets/index.js')).toBe(false);
  });

  it('rejects unknown formats', () => {
    expect(isSubscriptionRequestPath('/prosubscribe/unknown')).toBe(false);
    expect(isSubscriptionRequestPath('/a/b/c')).toBe(false);
  });
});
