async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok || payload?.success === false) {
    const message = payload?.message || payload?.error?.message || response.statusText || '请求失败';
    const error = new Error(message);
    error.code = payload?.error?.code || response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function jsonBody(data) {
  return data === undefined ? undefined : JSON.stringify(data);
}

export const api = {
  // auth
  login: (data) => request('/api/auth/login', { method: 'POST', body: jsonBody(data) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),

  // version
  version: () => request('/version'),

  // subscriptions
  subscriptions: () => request('/api/subscriptions'),
  subscription: (path) => request(`/api/subscriptions/${path}`),
  createSubscription: (data) => request('/api/subscriptions', { method: 'POST', body: jsonBody(data) }),
  updateSubscription: (path, data) => request(`/api/subscriptions/${path}`, { method: 'PUT', body: jsonBody(data) }),
  deleteSubscription: (path) => request(`/api/subscriptions/${path}`, { method: 'DELETE' }),
  saveSubconverter: (path, data) => request(`/api/subscriptions/${path}/subconverter`, { method: 'PUT', body: jsonBody(data) }),

  // nodes
  nodes: (path) => request(`/api/subscriptions/${path}/nodes`),
  createNode: (path, data) => request(`/api/subscriptions/${path}/nodes`, { method: 'POST', body: jsonBody(data) }),
  updateNode: (path, id, data) => request(`/api/subscriptions/${path}/nodes/${id}`, { method: 'PUT', body: jsonBody(data) }),
  deleteNode: (path, id) => request(`/api/subscriptions/${path}/nodes/${id}`, { method: 'DELETE' }),
  toggleNode: (path, id, enabled) => request(`/api/subscriptions/${path}/nodes/${id}`, { method: 'PATCH', body: jsonBody({ enabled }) }),
  reorderNodes: (path, orders) => request(`/api/subscriptions/${path}/nodes/reorder`, { method: 'POST', body: jsonBody({ orders }) }),

  // import & clash
  importNodes: (path, importUrl, importType) =>
    request(`/api/subscriptions/${path}/import-nodes`, { method: 'POST', body: jsonBody({ importUrl, importType }) }),
  generateClash: (data) => request('/api/clash/generate', { method: 'POST', body: jsonBody(data) }),
  loadTemplate: (templateUrl) => request('/api/clash/load-template', { method: 'POST', body: jsonBody({ templateUrl }) })
};
