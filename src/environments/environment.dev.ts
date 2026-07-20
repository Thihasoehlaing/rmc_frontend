export const environment = {
  production: false,
  staging: true,
  apiUrl: 'https://dev-api.apu.edu.my',
  apiPrefix: 'rmc',
  get apiBaseUrl(): string {
    return `${this.apiUrl.replace(/\/$/, '')}/${this.apiPrefix.replace(/^\/+|\/+$/g, '')}`;
  },
  authUrl: 'https://dev-auth.apu.edu.my',
  authRedirectUrl: 'https://rmc-dev.apu.edu.my',
  authAppName: 'quix',
};
