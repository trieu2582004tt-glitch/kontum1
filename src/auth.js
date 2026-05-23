export const authTokenKey = 'konTumAuthToken';

export function getAuthToken() {
  return localStorage.getItem(authTokenKey);
}

export function setAuthToken(token) {
  localStorage.setItem(authTokenKey, token);
}

export function clearAuthToken() {
  localStorage.removeItem(authTokenKey);
}

export function fetchWithAuth(url, options = {}) {
  const token = getAuthToken();
  // If body is FormData, let the browser set Content-Type (with boundary)
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers
  });
}
