const DEFAULT_PORT = '3003';
const API_PATH = '/v1';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export function resolveApiBaseUrl(): string {
  if (typeof globalThis !== 'undefined') {
    const override = globalThis.localStorage?.getItem('SUBMAN_API_BASE_URL');
    if (override) {
      return normalizeBaseUrl(override);
    }
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${DEFAULT_PORT}${API_PATH}`;
    }
  }

  return `http://localhost:${DEFAULT_PORT}${API_PATH}`;
}
