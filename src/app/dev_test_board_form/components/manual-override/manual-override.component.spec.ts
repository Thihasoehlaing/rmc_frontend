import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManualOverrideComponent } from './manual-override.component';

describe('ManualOverrideComponent', () => {
  let component: ManualOverrideComponent;
  let fixture: ComponentFixture<ManualOverrideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManualOverrideComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManualOverrideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add override value', () => {
    component.overrideForm.patchValue({
      overrideKey: 'testKey',
      overrideValue: 'testValue',
      overrideType: 'string',
      overrideDescription: 'Test override'
    });

    component.addOverride();
    expect(component.activeOverridesCount()).toBe(1);
  });

  it('should remove override value', () => {
    component.overrideForm.patchValue({
      overrideKey: 'testKey',
      overrideValue: 'testValue',
      overrideType: 'string'
    });
    component.addOverride();

    component.removeOverride('testKey');
    expect(component.activeOverridesCount()).toBe(0);
  });

  it('should clear all overrides', () => {
    component.overrideForm.patchValue({
      overrideKey: 'key1',
      overrideValue: 'value1',
      overrideType: 'string'
    });
    component.addOverride();

    component.overrideForm.patchValue({
      overrideKey: 'key2',
      overrideValue: 'value2',
      overrideType: 'string'
    });
    component.addOverride();

    expect(component.activeOverridesCount()).toBe(2);
  });

  it('should parse boolean override', () => {
    component.overrideForm.patchValue({
      overrideKey: 'isLoading',
      overrideValue: 'true',
      overrideType: 'boolean'
    });
    component.addOverride();

    const override = component.overrideValues().get('isLoading');
    expect(override?.value).toBe(true);
    expect(typeof override?.value).toBe('boolean');
  });

  it('should parse number override', () => {
    component.overrideForm.patchValue({
      overrideKey: 'timeout',
      overrideValue: '5000',
      overrideType: 'number'
    });
    component.addOverride();

    const override = component.overrideValues().get('timeout');
    expect(override?.value).toBe(5000);
    expect(typeof override?.value).toBe('number');
  });

  it('should apply preset profile', () => {
    expect(component.activeOverridesCount()).toBe(0);

    const profile = component.testProfiles[0];
    component.applyProfile(profile);

    expect(component.activeOverridesCount()).toBeGreaterThan(0);
  });
});
