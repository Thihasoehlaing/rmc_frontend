export const environment = {
  production: false,
  staging: true,
  apiUrl: 'https://rmc-api.apu.edu.my',
  apiPrefix: 'api',
  get apiBaseUrl(): string {
    return `${this.apiUrl.replace(/\/$/, '')}/${this.apiPrefix.replace(/^\/+|\/+$/g, '')}`;
  },
  authUrl: 'https://auth.apu.edu.my',
  authRedirectUrl: 'https://rmc.apu.edu.my',
  authAppName: 'apspace',
};
