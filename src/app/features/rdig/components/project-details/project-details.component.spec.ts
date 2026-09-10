// @vitest-environment jsdom

import '@angular/compiler';

import { FormBuilder } from '@angular/forms';
import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Router } from '@angular/router';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { MasterDataService } from '../../../../core/services/master-data.service';
import { rdigKeywordsValidator } from '../../utils/rdig-keywords.util';
import { RdigWorkflowService } from '../../services/rdig-workflow.service';
import { ProjectDetailsComponent } from './project-details.component';

describe('ProjectDetailsComponent keyword editor', () => {
  let component: ProjectDetailsComponent;
  let formBuilder: FormBuilder;

  beforeAll(() => {
    getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: MasterDataService, useValue: {} },
        { provide: Router, useValue: {} },
      ],
    });

    formBuilder = TestBed.inject(FormBuilder);
    component = TestBed.runInInjectionContext(() => new ProjectDetailsComponent());
    component.parentForm = formBuilder.group({
      projectDetails: formBuilder.group({
        keywords: ['', rdigKeywordsValidator],
      }),
      reviewProject: formBuilder.group({}),
    });
    component.workflow = {
      isFormReadOnly: () => false,
    } as RdigWorkflowService;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('saves five trimmed keywords in the existing API string format on confirm', () => {
    component.openKeywordsModal();
    component.keywordsForm.setValue({
      keyword1: ' Artificial Intelligence ',
      keyword2: 'Public Health',
      keyword3: 'Renewable Energy',
      keyword4: 'Climate Action',
      keyword5: 'Digital Education',
    });

    component.confirmKeywords();

    expect(component.projectDetails.get('keywords')?.value).toBe(
      'Artificial Intelligence, Public Health, Renewable Energy, Climate Action, Digital Education',
    );
    expect(component.projectDetails.get('keywords')?.valid).toBe(true);
    expect(component.isKeywordsModalOpen).toBe(false);
  });

  it('allows confirming a single keyword', () => {
    component.openKeywordsModal();
    component.keywordsForm.get('keyword1')?.setValue('Artificial Intelligence');

    component.confirmKeywords();

    expect(component.projectDetails.get('keywords')?.value).toBe('Artificial Intelligence');
    expect(component.projectDetails.get('keywords')?.valid).toBe(true);
    expect(component.isKeywordsModalOpen).toBe(false);
  });

  it('does not replace the saved value when the modal is cancelled', () => {
    component.projectDetails.get('keywords')?.setValue('One, Two, Three, Four, Five');
    component.openKeywordsModal();
    component.keywordsForm.get('keyword1')?.setValue('Changed');

    component.closeKeywordsModal();

    expect(component.projectDetails.get('keywords')?.value).toBe('One, Two, Three, Four, Five');
  });

  it('keeps the modal open until at least one keyword is provided', () => {
    component.openKeywordsModal();

    component.confirmKeywords();

    expect(component.isKeywordsModalOpen).toBe(true);
    expect(component.keywordsForm.get('keyword1')?.touched).toBe(true);
    expect(component.projectDetails.get('keywords')?.value).toBe('');
  });

  it('does not open the editor for a read-only form', () => {
    component.workflow = {
      isFormReadOnly: () => true,
    } as RdigWorkflowService;

    component.openKeywordsModal();

    expect(component.isKeywordsModalOpen).toBe(false);
  });
});
