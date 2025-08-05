export const environment = {
  production: true,
  apiUrl: (globalThis as any)?.['env']?.['API_URL'] || 'https://your-domain.com/api'
};