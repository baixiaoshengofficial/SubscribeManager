const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function isCredentialAutocompleteAllowed(locationLike = window.location) {
  const protocol = locationLike?.protocol || '';
  const hostname = locationLike?.hostname || '';
  return protocol === 'https:' || LOCAL_HOSTS.has(hostname);
}
