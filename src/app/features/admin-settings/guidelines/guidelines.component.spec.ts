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
    `${environment.apiBaseUrl}/admin-settings/guidelines`;

  const listResponse = {
    success: true,
    message: 'Guidelines retrieved successfully',
    data: {
      items: [
        {
          id: 1,
          form_id: 5,
          form_code: 'RDIG',
          form_name: 'RDIG Application',
          title: 'RDIG Guidelines',
          is_active: true,
          created_by: 'admin',
          created_at: '2026-06-01T10:00:00',
          updated_by: 'system.admin',
          updated_at: '2026-06-12T10:00:00',
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
    expect(component.guidelines()[0].formId).toBe(5);
    expect(component.totalGuidelines()).toBe(1);
  });

  it('maps the editor config to the create API payload', () => {
    http.expectOne(`${baseUrl}?page=1&per_page=5`).flush(listResponse);

    const config: GuidelineConfig = {
      title: 'Conference Guidelines',
      formId: 3,
      contentHtml: '<p>Submit the completed form.</p>',
    };

    component.saveGuideline(config);

    const createRequest = http.expectOne(baseUrl);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual({
      form_id: 3,
      title: 'Conference Guidelines',
      content_html: '<p>Submit the completed form.</p>',
    });
    createRequest.flush({
      success: true,
      message: 'Guideline created successfully',
      data: listResponse.data.items[0],
    });

    http.expectOne(`${baseUrl}?page=1&per_page=5`).flush(listResponse);
  });

  it('deletes a guideline after confirming, with no activate/deactivate step', () => {
    http.expectOne(`${baseUrl}?page=1&per_page=5`).flush(listResponse);
    const guideline = component.guidelines()[0];

    component.openDeleteDialog(guideline);
    expect(component.guidelineToDelete()).toBe(guideline);

    component.confirmDelete();

    const deleteRequest = http.expectOne(`${baseUrl}/1`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush({
      success: true,
      message: 'Guideline deleted successfully',
      data: listResponse.data.items[0],
    });

    expect(component.guidelineToDelete()).toBeNull();
    http.expectOne(`${baseUrl}?page=1&per_page=5`).flush({
      ...listResponse,
      data: { ...listResponse.data, items: [], pagination: { ...listResponse.data.pagination, total_items: 0 } },
    });
  });
});
