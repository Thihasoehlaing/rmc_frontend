import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbacOverrideComponent } from './abac-override.component';

describe('AbacOverrideComponent', () => {
  let component: AbacOverrideComponent;
  let fixture: ComponentFixture<AbacOverrideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbacOverrideComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AbacOverrideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle ABAC override', () => {
    expect(component.isABACOverrideEnabled()).toBeFalsy();
    component.toggleABACOverride();
    expect(component.isABACOverrideEnabled()).toBeTruthy();
    component.toggleABACOverride();
    expect(component.isABACOverrideEnabled()).toBeFalsy();
  });

  it('should apply preset profile', () => {
    const profile = component.presetProfiles[0];
    component.applyPresetProfile(profile);
    expect(component.isABACOverrideEnabled()).toBeTruthy();
    expect(component.activeProfileName()).toBe(profile.name);
    expect(component.groupCount()).toBe(profile.groups.length);
  });

  it('should toggle group selection', () => {
    component.toggleGroup('Admin');
    expect(component.selectedGroupsArray()).toContain('Admin');
    component.toggleGroup('Admin');
    expect(component.selectedGroupsArray()).not.toContain('Admin');
  });

  it('should clear all groups', () => {
    component.toggleGroup('Admin');
    component.toggleGroup('RMC');
    expect(component.groupCount()).toBe(2);
    component.clearAllGroups();
    expect(component.groupCount()).toBe(0);
  });
});
