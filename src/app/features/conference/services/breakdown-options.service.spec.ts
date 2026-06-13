import { TestBed } from '@angular/core/testing';
import { BreakdownOptionsService } from './breakdown-options.service';

describe('BreakdownOptionsService', () => {
  let service: BreakdownOptionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    localStorage.clear();
    service = TestBed.inject(BreakdownOptionsService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load default research options', () => {
    const options = service.getOptionsForType('research');
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]).toHaveProperty('value');
    expect(options[0]).toHaveProperty('label');
  });

  it('should add a new option', () => {
    const initialCount = service.getOptionsForType('research').length;
    service.addOption('research', { value: 'test', label: 'Test Option' });
    const afterCount = service.getOptionsForType('research').length;
    expect(afterCount).toBe(initialCount + 1);
  });

  it('should throw error when adding duplicate option', () => {
    service.addOption('research', { value: 'duplicate', label: 'Duplicate' });
    expect(() => {
      service.addOption('research', { value: 'duplicate', label: 'Duplicate 2' });
    }).toThrowError('already exists');
  });

  it('should update an existing option', () => {
    service.addOption('research', { value: 'test', label: 'Original' });
    service.updateOption('research', 'test', { value: 'test', label: 'Updated' });
    const option = service.getOptionsForType('research').find(o => o.value === 'test');
    expect(option?.label).toBe('Updated');
  });

  it('should delete an option', () => {
    service.addOption('research', { value: 'test', label: 'Test Option' });
    const beforeCount = service.getOptionsForType('research').length;
    service.deleteOption('research', 'test');
    const afterCount = service.getOptionsForType('research').length;
    expect(afterCount).toBe(beforeCount - 1);
  });

  it('should reset to defaults', () => {
    service.addOption('research', { value: 'test', label: 'Test Option' });
    service.resetToDefaults();
    const options = service.getOptionsForType('research');
    const hasTest = options.some(o => o.value === 'test');
    expect(hasTest).toBeFalsy();
  });

  it('should persist options to localStorage', () => {
    service.addOption('research', { value: 'persist', label: 'Persistent' });
    const stored = localStorage.getItem('rmc_breakdown_options');
    expect(stored).toBeTruthy();
    const data = JSON.parse(stored!);
    const hasPersist = data.researchOptions.some((o: any) => o.value === 'persist');
    expect(hasPersist).toBeTruthy();
  });
});
