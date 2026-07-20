export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
  apiPrefix: 'rmc',
  get apiBaseUrl(): string {
    return `${this.apiUrl.replace(/\/$/, '')}/${this.apiPrefix.replace(/^\/+|\/+$/g, '')}`;
  },
  authUrl: 'https://dev-auth.apu.edu.my',
  authRedirectUrl: 'http://localhost:4200',
  authAppName: 'quix',
};
