import { environment as localEnvironment } from './environment';
import { environment as devEnvironment } from './environment.dev';
import { environment as productionEnvironment } from './environment.production';

describe('API environment configuration', () => {
  it('uses the rmc prefix for local and dev requests', () => {
    expect(localEnvironment.apiBaseUrl).toBe('http://localhost:8000/rmc');
    expect(devEnvironment.apiBaseUrl).toBe('https://dev-api.apu.edu.my/rmc');
  });

  it('uses the api prefix for production requests', () => {
    expect(productionEnvironment.apiBaseUrl).toBe('https://rmc-api.apu.edu.my/api');
  });
});
