import { describe, expect, it } from 'vitest';
import { isCredentialAutocompleteAllowed } from '../src/utils/credentialAutocomplete.js';

describe('isCredentialAutocompleteAllowed', () => {
  it('allows HTTPS origins', () => {
    expect(isCredentialAutocompleteAllowed({ protocol: 'https:', hostname: 'example.com' })).toBe(true);
  });

  it('allows local development origins over HTTP', () => {
    expect(isCredentialAutocompleteAllowed({ protocol: 'http:', hostname: 'localhost' })).toBe(true);
    expect(isCredentialAutocompleteAllowed({ protocol: 'http:', hostname: '127.0.0.1' })).toBe(true);
    expect(isCredentialAutocompleteAllowed({ protocol: 'http:', hostname: '::1' })).toBe(true);
  });

  it('disables autocomplete for plain HTTP remote origins', () => {
    expect(isCredentialAutocompleteAllowed({ protocol: 'http:', hostname: 'example.com' })).toBe(false);
  });
});
