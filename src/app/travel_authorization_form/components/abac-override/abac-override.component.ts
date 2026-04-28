import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { UserGroup } from '../../../interfaces/user.interface';

interface ABACProfile {
  name: string;
  description: string;
  groups: UserGroup[];
  isPreset: boolean;
}

@Component({
  selector: 'app-abac-override',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './abac-override.component.html',
  styleUrl: './abac-override.component.scss'
})
export class AbacOverrideComponent {
  private fb = inject(FormBuilder);

  // Available user groups
  availableGroups: UserGroup[] = [
    'full_time',
    'contract',
    'academic',
    'HOS',
    'VC',
    'group_ra_gra_hos_pass',
    'blocked_hos_rdig',
    'RMC',
    'Admin',
    'Reviewer',
    'Reviewer1',
    'Reviewer2',
    'RDIG_Chair',
    'CEO'
  ];

  // Signals
  isABACOverrideEnabled = signal<boolean>(false);
  selectedGroups = signal<Set<UserGroup>>(new Set());
  customProfiles = signal<ABACProfile[]>([]);
  activeProfileName = signal<string>('');
  showProfileManager = signal<boolean>(false);
  newProfileForm: FormGroup;

  // Computed values
  selectedGroupsArray = computed(() => Array.from(this.selectedGroups()));
  groupCount = computed(() => this.selectedGroups().size);
  profileCount = computed(() => this.customProfiles().length);

  // Preset ABAC profiles for testing
  presetProfiles: ABACProfile[] = [
    {
      name: 'Student User',
      description: 'Basic student with no special permissions',
      groups: ['full_time'],
      isPreset: true
    },
    {
      name: 'Academic Staff',
      description: 'Lecturer/Researcher with academic access',
      groups: ['full_time', 'academic'],
      isPreset: true
    },
    {
      name: 'Head of School',
      description: 'HOS with approval permissions',
      groups: ['full_time', 'academic', 'HOS'],
      isPreset: true
    },
    {
      name: 'RMC Staff',
      description: 'Research Management Committee staff',
      groups: ['full_time', 'academic', 'RMC'],
      isPreset: true
    },
    {
      name: 'Admin User',
      description: 'Full system administrator',
      groups: ['full_time', 'academic', 'Admin'],
      isPreset: true
    },
    {
      name: 'Reviewer',
      description: 'Application reviewer',
      groups: ['full_time', 'academic', 'Reviewer'],
      isPreset: true
    },
    {
      name: 'Vice Chancellor',
      description: 'Vice Chancellor with high-level approvals',
      groups: ['full_time', 'academic', 'VC'],
      isPreset: true
    },
    {
      name: 'Blocked HOS',
      description: 'HOS blocked from RDIG submissions',
      groups: ['full_time', 'academic', 'HOS', 'blocked_hos_rdig'],
      isPreset: true
    },
    {
      name: 'RDIG Chair',
      description: 'RDIG Research Chair',
      groups: ['full_time', 'academic', 'RDIG_Chair'],
      isPreset: true
    },
    {
      name: 'CEO',
      description: 'Chief Executive Officer with final approvals',
      groups: ['full_time', 'academic', 'CEO'],
      isPreset: true
    }
  ];

  constructor() {
    this.newProfileForm = this.fb.group({
      profileName: ['', [Validators.required, Validators.minLength(3)]],
      profileDescription: ['', [Validators.maxLength(200)]]
    });

    // Load custom profiles from localStorage
    effect(() => {
      if (this.isABACOverrideEnabled()) {
        this.loadCustomProfiles();
      }
    });
  }

  /**
   * Toggle ABAC override on/off
   */
  toggleABACOverride(): void {
    this.isABACOverrideEnabled.update(val => !val);
    if (!this.isABACOverrideEnabled()) {
      this.selectedGroups.set(new Set());
      this.activeProfileName.set('');
    }
  }

  /**
   * Apply a preset profile
   */
  applyPresetProfile(profile: ABACProfile): void {
    this.selectedGroups.set(new Set(profile.groups));
    this.activeProfileName.set(profile.name);
    this.isABACOverrideEnabled.set(true);
  }

  /**
   * Apply a custom profile
   */
  applyCustomProfile(profile: ABACProfile): void {
    this.selectedGroups.set(new Set(profile.groups));
    this.activeProfileName.set(profile.name);
  }

  /**
   * Toggle a group selection
   */
  toggleGroup(group: UserGroup): void {
    const newGroups = new Set(this.selectedGroups());
    if (newGroups.has(group)) {
      newGroups.delete(group);
    } else {
      newGroups.add(group);
    }
    this.selectedGroups.set(newGroups);
    this.activeProfileName.set(''); // Clear active profile when manually selecting
  }

  /**
   * Clear all selected groups
   */
  clearAllGroups(): void {
    this.selectedGroups.set(new Set());
    this.activeProfileName.set('');
  }

  /**
   * Show profile manager modal
   */
  showProfileManagerModal(): void {
    this.showProfileManager.set(true);
    this.newProfileForm.reset();
  }

  /**
   * Hide profile manager modal
   */
  closeProfileManager(): void {
    this.showProfileManager.set(false);
    this.newProfileForm.reset();
  }

  /**
   * Save a new custom profile
   */
  saveCustomProfile(): void {
    if (this.newProfileForm.valid && this.selectedGroups().size > 0) {
      const newProfile: ABACProfile = {
        name: this.newProfileForm.get('profileName')?.value,
        description: this.newProfileForm.get('profileDescription')?.value || '',
        groups: Array.from(this.selectedGroups()),
        isPreset: false
      };

      const profiles = [...this.customProfiles()];
      profiles.push(newProfile);
      this.customProfiles.set(profiles);
      this.saveProfilesToLocalStorage(profiles);
      this.closeProfileManager();
    }
  }

  /**
   * Delete a custom profile
   */
  deleteCustomProfile(profileName: string): void {
    const profiles = this.customProfiles().filter(p => p.name !== profileName);
    this.customProfiles.set(profiles);
    this.saveProfilesToLocalStorage(profiles);
    if (this.activeProfileName() === profileName) {
      this.activeProfileName.set('');
      this.selectedGroups.set(new Set());
    }
  }

  /**
   * Save profiles to localStorage
   */
  private saveProfilesToLocalStorage(profiles: ABACProfile[]): void {
    localStorage.setItem('abac_custom_profiles', JSON.stringify(profiles));
  }

  /**
   * Load profiles from localStorage
   */
  private loadCustomProfiles(): void {
    const stored = localStorage.getItem('abac_custom_profiles');
    if (stored) {
      try {
        const profiles = JSON.parse(stored) as ABACProfile[];
        this.customProfiles.set(profiles);
      } catch (e) {
        console.error('Failed to load custom ABAC profiles', e);
      }
    }
  }

  /**
   * Get all profiles (preset + custom)
   */
  getAllProfiles(): ABACProfile[] {
    return [...this.presetProfiles, ...this.customProfiles()];
  }
}
