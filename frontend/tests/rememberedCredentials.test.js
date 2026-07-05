// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { loadRememberedCredentials, saveRememberedCredentials, clearRememberedCredentials } from '../src/utils/rememberedCredentials';

describe('rememberedCredentials', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty credentials when nothing is stored', () => {
    expect(loadRememberedCredentials()).toEqual({ username: '', password: '' });
  });

  it('saves and loads credentials under the current origin key', () => {
    saveRememberedCredentials({ username: 'admin', password: 's3cret' });
    expect(loadRememberedCredentials()).toEqual({ username: 'admin', password: 's3cret' });
  });

  it('removes credentials when unchecked', () => {
    saveRememberedCredentials({ username: 'admin', password: 's3cret' });
    clearRememberedCredentials();
    expect(loadRememberedCredentials()).toEqual({ username: '', password: '' });
  });

  it('scopes credentials by origin (http vs https do not collide)', () => {
    const origin = window.location.origin;
    saveRememberedCredentials({ username: 'alice', password: 'p1' });

    // Simulate a different origin by tweaking the stored key directly.
    const raw = localStorage.getItem(`sm.credentials:${origin}`);
    localStorage.setItem(`sm.credentials:http://other.example`, raw);
    localStorage.removeItem(`sm.credentials:${origin}`);

    expect(loadRememberedCredentials()).toEqual({ username: '', password: '' });
  });

  it('ignores malformed payloads and returns empty credentials', () => {
    localStorage.setItem(`sm.credentials:${window.location.origin}`, '{not valid json');
    expect(loadRememberedCredentials()).toEqual({ username: '', password: '' });
  });
});
