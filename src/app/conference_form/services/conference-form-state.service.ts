import { Injectable, signal } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';

/**
 * State structure for each form in the conference application.
 * Persists form data across step navigation.
 */
export interface ConferenceFormState {
  conferenceDetails?: {
    conferenceName?: string;
    location?: string;
    country?: string;
    conferenceStartDate?: string;
    conferenceEndDate?: string;
    acceptanceReceivedDate?: string;
    paperAcceptanceDate?: string;
    presentationType?: string;
    proofOfAcceptance?: string;
    presentationLink?: string;
    localBreakdown?: Array<{
      researchDirection?: string;
      fundingAmount?: number;
      researchArea?: string;
    }>;
    overseasBreakdown?: Array<{
      researchDirection?: string;
      fundingAmount?: number;
      city?: string;
      country?: string;
    }>;
    researchBreakdown?: Array<{
      researchDirection?: string;
      fundingAmount?: number;
    }>;
    externalResearchBreakdown?: Array<{
      researchDirection?: string;
      fundingAmount?: number;
    }>;
    [key: string]: any;
  };
  authorDetails?: {
    fullName?: string;
    employeeId?: string;
    designation?: string;
    department?: string;
    email?: string;
    phoneNumber?: string;
    isPresenter?: boolean;
    testSubsections?: Array<any>;
    studentCoAuthors?: Array<any>;
    nonApuCoAuthors?: Array<any>;
    [key: string]: any;
  };
  supportingDocuments?: {
    acceptanceNotification?: string;
    reviewersFeedback?: string;
    scopusEvidencePublication?: string;
    turnitinReport?: string;
    finalPaperDraft?: string;
    conferenceInvoice?: string;
    manuscriptInternallyReviewed?: string;
    reviewerName?: string;
    manuscriptPreviouslyPublished?: string;
    [key: string]: any;
  };
  declaration?: {
    confirmPresenter?: boolean;
    confirmScopusIndexed?: boolean;
    confirmNotResignedStaff?: boolean;
    confirmJointAuthorship?: boolean;
    confirmCompliance?: boolean;
    confirmPostReturn?: boolean;
    agreeToTerms?: boolean;
    acknowledgeGrantFunder?: boolean;
    [key: string]: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConferenceFormStateService {
  private formState = signal<ConferenceFormState>({});

  constructor() {
    // Initialize from localStorage if available
    this.loadFromStorage();
  }

  /**
   * Get the entire form state
   */
  getFormState(): ConferenceFormState {
    return this.formState();
  }

  /**
   * Get a specific form's state
   */
  getFormSection<K extends keyof ConferenceFormState>(
    section: K
  ): ConferenceFormState[K] | undefined {
    return this.formState()[section];
  }

  /**
   * Save a specific form's state
   * @param section The form section key (e.g., 'authorDetails', 'supportingDocuments')
   * @param data The form data to save
   */
  saveFormSection<K extends keyof ConferenceFormState>(
    section: K,
    data: ConferenceFormState[K]
  ): void {
    const currentState = this.formState();
    const updatedState: ConferenceFormState = {
      ...currentState,
      [section]: data
    };
    this.formState.set(updatedState);
    this.saveToStorage(updatedState);
  }

  /**
   * Restore a form's state, including FormArrays
   * @param form The FormGroup to restore state to
   * @param savedData The saved form data
   * @param arrayFields Map of array field names to their creator functions
   */
  restoreFormState(
    form: FormGroup,
    savedData: any,
    arrayFields?: { [key: string]: (data: any) => any }
  ): void {
    if (!savedData || !form) return;

    // First, restore non-array fields
    const nonArrayData: any = {};
    for (const key in savedData) {
      if (arrayFields && key in arrayFields) {
        // Skip array fields for now
        continue;
      }
      nonArrayData[key] = savedData[key];
    }
    form.patchValue(nonArrayData, { emitEvent: false });

    // Then restore FormArray fields
    if (arrayFields) {
      for (const [fieldName, creatorFn] of Object.entries(arrayFields)) {
        if (savedData[fieldName] && Array.isArray(savedData[fieldName])) {
          const arrayControl = form.get(fieldName) as FormArray;
          if (arrayControl) {
            // Clear existing controls
            while (arrayControl.length > 0) {
              arrayControl.removeAt(0);
            }
            // Re-add controls from saved data
            const arrayData = savedData[fieldName] as any[];
            arrayData.forEach(item => {
              const control = creatorFn(item);
              arrayControl.push(control);
            });
          }
        }
      }
    }
  }

  /**
   * Clear all form state
   */
  clearFormState(): void {
    this.formState.set({});
    localStorage.removeItem('conferenceFormState');
  }

  /**
   * Clear a specific form section
   */
  clearFormSection<K extends keyof ConferenceFormState>(section: K): void {
    const currentState = this.formState();
    const { [section]: _, ...rest } = currentState;
    this.formState.set(rest);
    this.saveToStorage(rest);
  }

  /**
   * Save form state to localStorage for persistence across page refreshes
   */
  private saveToStorage(state: ConferenceFormState): void {
    try {
      localStorage.setItem('conferenceFormState', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save form state to localStorage:', error);
    }
  }

  /**
   * Load form state from localStorage
   */
  private loadFromStorage(): void {
    try {
      const storedState = localStorage.getItem('conferenceFormState');
      if (storedState) {
        this.formState.set(JSON.parse(storedState));
      }
    } catch (error) {
      console.error('Failed to load form state from localStorage:', error);
    }
  }
}
