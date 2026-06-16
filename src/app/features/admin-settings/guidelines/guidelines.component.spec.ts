import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { GuidelineConfig } from './add-guideline-modal/add-guideline-modal.component';
import { GuidelinesComponent } from './guidelines.component';

describe('GuidelinesComponent', () => {
  let component: GuidelinesComponent;
  let fixture: ComponentFixture<GuidelinesComponent>;
  let http: HttpTestingController;

  const baseUrl =
    `${environment.apiUrl.replace(/\/$/, '')}/api/admin-settings/guidelines`;

  const listResponse = {
    success: true,
    message: 'Guidelines retrieved successfully',
    data: {
      items: [
        {
          id: 1,
          form_id: 1,
          form_code: 'RDIG',
          form_name: 'RDIG Application Process',
          guideline_title: 'RDIG Guidelines',
          button_text: 'Close',
          is_active: true,
          background_token: 'white',
          text_token: 'var(--color-text-primary)',
          button_token: 'var(--color-primary)',
          created_by: 'admin',
          created_at: '2026-06-01T10:00:00',
          updated_by: 'system.admin',
          updated_at: '2026-06-12T10:00:00',
          block_count: 2,
        },
      ],
      pagination: {
        current_page: 1,
        per_page: 5,
        total_items: 1,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuidelinesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(GuidelinesComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('loads guidelines using server pagination', () => {
    const request = http.expectOne(
      `${baseUrl}?page=1&per_page=5`,
    );
    request.flush(listResponse);

    expect(component.guidelines()).toHaveLength(1);
    expect(component.guidelines()[0].form).toBe('RDIG Application');
    expect(component.guidelines()[0].blockCount).toBe(2);
    expect(component.totalGuidelines()).toBe(1);
  });

  it('maps the editor config to the create API payload', () => {
    http.expectOne(`${baseUrl}?page=1&per_page=5`).flush(listResponse);

    const config: GuidelineConfig = {
      title: 'Conference Guidelines',
      formName: 'Conference Application',
      backgroundToken: 'white',
      textToken: 'var(--color-text-primary)',
      buttonToken: 'var(--color-primary)',
      buttonText: 'Close',
      blocks: [
        {
          id: 'block-1',
          type: 'text',
          content: 'Submit the completed form.',
        },
      ],
    };

    component.saveGuideline(config);

    const createRequest = http.expectOne(baseUrl);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual({
      form_code: 'CONFERENCE',
      guideline_title: 'Conference Guidelines',
      button_text: 'Close',
      is_active: true,
      background_token: 'white',
      text_token: 'var(--color-text-primary)',
      button_token: 'var(--color-primary)',
      blocks: [
        {
          block_type: 'text',
          block_content: 'Submit the completed form.',
          display_order: 1,
          background_token: null,
          text_token: null,
          font_size_token: null,
          font_weight_token: null,
        },
      ],
    });
    createRequest.flush({
      success: true,
      message: 'Guideline created successfully',
      data: listResponse.data.items[0],
    });

    http.expectOne(`${baseUrl}?page=1&per_page=5`).flush(listResponse);
  });

  it('updates guideline status through the status endpoint', () => {
    http.expectOne(`${baseUrl}?page=1&per_page=5`).flush(listResponse);
    const guideline = component.guidelines()[0];

    component.toggleGuidelineStatus(guideline);

    const statusRequest = http.expectOne(`${baseUrl}/1/status`);
    expect(statusRequest.request.method).toBe('PATCH');
    expect(statusRequest.request.body).toEqual({ is_active: false });
    statusRequest.flush({
      success: true,
      message: 'Guideline status updated successfully',
      data: { ...listResponse.data.items[0], is_active: false },
    });

    http.expectOne(`${baseUrl}?page=1&per_page=5`).flush(listResponse);
  });
});
