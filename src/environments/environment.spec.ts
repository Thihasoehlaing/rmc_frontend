import { environment as localEnvironment } from './environment';
import { environment as devEnvironment } from './environment.dev';
import { environment as productionEnvironment } from './environment.production';

describe('API environment configuration', () => {
  it('uses the correct apiUrl for local and dev', () => {
    expect(localEnvironment.apiUrl).toBe('http://localhost:8000');
    expect(devEnvironment.apiUrl).toBe('https://dev-api.apu.edu.my');
  });

  it('uses the correct apiUrl for production', () => {
    expect(productionEnvironment.apiUrl).toBe('https://rmc-api.apu.edu.my');
  });
});
