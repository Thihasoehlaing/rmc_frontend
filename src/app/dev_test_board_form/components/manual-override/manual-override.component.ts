import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { KeyValuePipe } from '@angular/common';

interface OverrideValue {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'date';
  description: string;
}

interface OverrideProfile {
  name: string;
  description: string;
  overrides: OverrideValue[];
  createdAt: Date;
  isActive: boolean;
}

@Component({
  selector: 'app-manual-override',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, KeyValuePipe],
  templateUrl: './manual-override.component.html',
  styleUrl: './manual-override.component.scss'
})
export class ManualOverrideComponent {
  private fb = inject(FormBuilder);

  // Override states
  isOverrideEnabled = signal<boolean>(false);
  selectedProfileName = signal<string>('');
  overrideValues = signal<Map<string, OverrideValue>>(new Map());
  overrideProfiles = signal<OverrideProfile[]>([]);
  showJSONEditor = signal<boolean>(false);
  jsonEditorContent = signal<string>('{}');

  // Form
  overrideForm: FormGroup;

  // Computed
  activeOverridesCount = computed(() => this.overrideValues().size);
  hasActiveProfiles = computed(() => this.overrideProfiles().length > 0);
  jsonValidationError = signal<string>('');

  // Preset override templates
  testProfiles: OverrideProfile[] = [
    {
      name: 'Empty Form Test',
      description: 'Test with all empty form fields',
      overrides: [
        { key: 'title', value: '', type: 'string', description: 'Empty modal title' },
        { key: 'buttonText', value: '', type: 'string', description: 'Empty button text' },
        { key: 'contentLength', value: 0, type: 'number', description: 'No content blocks' }
      ],
      createdAt: new Date(),
      isActive: false
    },
    {
      name: 'Max Content Test',
      description: 'Test with maximum content and blocks',
      overrides: [
        { key: 'title', value: 'Very Long Title '.repeat(10), type: 'string', description: 'Long title text' },
        { key: 'buttonText', value: 'Click Me Now', type: 'string', description: 'Standard button text' },
        { key: 'contentLength', value: 50, type: 'number', description: 'Many content blocks' },
        { key: 'simulateLoading', value: true, type: 'boolean', description: 'Simulate loading state' }
      ],
      createdAt: new Date(),
      isActive: false
    },
    {
      name: 'Error State Test',
      description: 'Test error handling and states',
      overrides: [
        { key: 'hasError', value: true, type: 'boolean', description: 'Show error state' },
        { key: 'errorMessage', value: 'Test error occurred', type: 'string', description: 'Error message' },
        { key: 'isDisabled', value: true, type: 'boolean', description: 'Disable form controls' }
      ],
      createdAt: new Date(),
      isActive: false
    },
    {
      name: 'Accessibility Test',
      description: 'Test accessibility features',
      overrides: [
        { key: 'showAriaLabels', value: true, type: 'boolean', description: 'Show ARIA labels' },
        { key: 'highContrast', value: true, type: 'boolean', description: 'Enable high contrast mode' },
        { key: 'fontSizeMultiplier', value: 1.5, type: 'number', description: 'Increase font size' },
        { key: 'reduceMotion', value: true, type: 'boolean', description: 'Reduce animations' }
      ],
      createdAt: new Date(),
      isActive: false
    },
    {
      name: 'Responsive Test - Mobile',
      description: 'Test mobile viewport',
      overrides: [
        { key: 'viewportWidth', value: 375, type: 'number', description: 'Mobile width' },
        { key: 'viewportHeight', value: 667, type: 'number', description: 'Mobile height' },
        { key: 'deviceType', value: 'mobile', type: 'string', description: 'Device type' },
        { key: 'touchEnabled', value: true, type: 'boolean', description: 'Touch interface' }
      ],
      createdAt: new Date(),
      isActive: false
    },
    {
      name: 'Performance Test',
      description: 'Test with large datasets',
      overrides: [
        { key: 'largeDataset', value: true, type: 'boolean', description: 'Load large dataset' },
        { key: 'itemCount', value: 10000, type: 'number', description: 'Number of items' },
        { key: 'simulateSlowNetwork', value: true, type: 'boolean', description: 'Throttle network' },
        { key: 'networkDelay', value: 5000, type: 'number', description: 'Network delay in ms' }
      ],
      createdAt: new Date(),
      isActive: false
    }
  ];

  constructor() {
    this.overrideProfiles.set([...this.testProfiles]);
    this.overrideForm = this.fb.group({
      overrideKey: ['', Validators.required],
      overrideValue: ['', Validators.required],
      overrideType: ['string', Validators.required],
      overrideDescription: ['']
    });
  }

  /**
   * Add a new override value
   */
  addOverride() {
    if (this.overrideForm.invalid) {
      return;
    }

    const { overrideKey, overrideValue, overrideType, overrideDescription } = this.overrideForm.value;

    let parsedValue = overrideValue;
    try {
      if (overrideType === 'json') {
        parsedValue = JSON.parse(overrideValue);
      } else if (overrideType === 'number') {
        parsedValue = Number(overrideValue);
      } else if (overrideType === 'boolean') {
        parsedValue = overrideValue === 'true' || overrideValue === true;
      }
    } catch (e) {
      alert('Invalid value format for type: ' + overrideType);
      return;
    }

    const newOverride: OverrideValue = {
      key: overrideKey,
      value: parsedValue,
      type: overrideType,
      description: overrideDescription
    };

    const currentOverrides = new Map(this.overrideValues());
    currentOverrides.set(overrideKey, newOverride);
    this.overrideValues.set(currentOverrides);

    // Emit override event (in real scenario, this would be observed by parent component)
    this.notifyOverrideChange(newOverride);

    this.overrideForm.reset({ overrideType: 'string' });
  }

  /**
   * Remove an override value
   */
  removeOverride(key: string) {
    const currentOverrides = new Map(this.overrideValues());
    currentOverrides.delete(key);
    this.overrideValues.set(currentOverrides);
    this.notifyOverrideRemoved(key);
  }

  /**
   * Clear all overrides
   */
  clearAllOverrides() {
    if (confirm('Clear all overrides?')) {
      this.overrideValues.set(new Map());
      this.isOverrideEnabled.set(false);
      this.notifyAllOverridesCleared();
    }
  }

  /**
   * Apply a preset profile
   */
  applyProfile(profile: OverrideProfile) {
    const overridesMap = new Map<string, OverrideValue>();
    profile.overrides.forEach(override => {
      overridesMap.set(override.key, override);
    });
    this.overrideValues.set(overridesMap);
    this.selectedProfileName.set(profile.name);
    this.isOverrideEnabled.set(true);
    this.notifyProfileApplied(profile.name);
  }

  /**
   * Save current overrides as a new profile
   */
  saveAsProfile() {
    const profileName = prompt('Enter profile name:');
    if (!profileName) return;

    const newProfile: OverrideProfile = {
      name: profileName,
      description: prompt('Enter profile description:') || 'Custom profile',
      overrides: Array.from(this.overrideValues().values()),
      createdAt: new Date(),
      isActive: false
    };

    const currentProfiles = [...this.overrideProfiles()];
    currentProfiles.push(newProfile);
    this.overrideProfiles.set(currentProfiles);
    this.notifyProfileSaved(profileName);
  }

  /**
   * Delete a profile
   */
  deleteProfile(profileName: string) {
    if (confirm(`Delete profile "${profileName}"?`)) {
      const filtered = this.overrideProfiles().filter(p => p.name !== profileName);
      this.overrideProfiles.set(filtered);
      this.notifyProfileDeleted(profileName);
    }
  }

  /**
   * Export overrides as JSON
   */
  exportOverrides() {
    const exportData = {
      overrides: Array.from(this.overrideValues().values()),
      timestamp: new Date().toISOString()
    };
    const json = JSON.stringify(exportData, null, 2);
    this.downloadJSON(json, 'test-overrides.json');
  }

  /**
   * Import overrides from JSON
   */
  importOverrides() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const data = JSON.parse(event.target.result);
          const overridesMap = new Map<string, OverrideValue>();
          data.overrides.forEach((override: OverrideValue) => {
            overridesMap.set(override.key, override);
          });
          this.overrideValues.set(overridesMap);
          this.isOverrideEnabled.set(true);
          this.notifyOverridesImported();
        } catch (error) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  /**
   * Open JSON editor for bulk override
   */
  openJSONEditor() {
    const overridesData = Array.from(this.overrideValues().values());
    this.jsonEditorContent.set(JSON.stringify(overridesData, null, 2));
    this.showJSONEditor.set(true);
    this.jsonValidationError.set('');
  }

  /**
   * Save changes from JSON editor
   */
  saveJSONChanges() {
    try {
      const parsed = JSON.parse(this.jsonEditorContent());
      const overridesMap = new Map<string, OverrideValue>();

      if (Array.isArray(parsed)) {
        parsed.forEach((item: OverrideValue) => {
          overridesMap.set(item.key, item);
        });
      }

      this.overrideValues.set(overridesMap);
      this.showJSONEditor.set(false);
      this.jsonValidationError.set('');
      this.notifyOverridesUpdated();
    } catch (error) {
      this.jsonValidationError.set('Invalid JSON format: ' + (error as Error).message);
    }
  }

  /**
   * Notification methods (can be replaced with proper event emitters in parent)
   */
  private notifyOverrideChange(override: OverrideValue) {
    console.log('[Override] Added/Updated:', override);
  }

  private notifyOverrideRemoved(key: string) {
    console.log('[Override] Removed:', key);
  }

  private notifyAllOverridesCleared() {
    console.log('[Override] All cleared');
  }

  private notifyProfileApplied(profileName: string) {
    console.log('[Profile] Applied:', profileName);
  }

  private notifyProfileSaved(profileName: string) {
    console.log('[Profile] Saved:', profileName);
  }

  private notifyProfileDeleted(profileName: string) {
    console.log('[Profile] Deleted:', profileName);
  }

  private notifyOverridesImported() {
    console.log('[Override] Imported');
  }

  private notifyOverridesUpdated() {
    console.log('[Override] Updated from JSON');
  }

  /**
   * Download JSON file
   */
  private downloadJSON(json: string, filename: string) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Get display value for override
   */
  getDisplayValue(value: any): string {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Tracking function for *ngFor with keyvalue pipe
   */
  trackByKey(index: number, item: any): string {
    return item.key;
  }
}
