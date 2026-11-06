import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DropdownsComponent } from './dropdowns.component';

describe('DropdownsComponent', () => {
  let component: DropdownsComponent;
  let fixture: ComponentFixture<DropdownsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DropdownsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne((req) => req.url.includes('/forms'))
      .flush({
        success: true,
        data: ['RDIG', 'RA_GRA', 'CONFERENCE', 'JOURNAL', 'TRAVEL_AUTH', 'PARTNERSHIP'].map(
          (form_code, index) => ({
            id: index + 1,
            form_code,
            form_name: form_code,
            is_active: true,
          }),
        ),
      });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the dropdown form sections', () => {
    expect(component.sections().length).toBe(6);
    expect(component.sections()[0].title).toBe('RDIG Dropdown Options');
  });
});

afterEach(() => TestBed.resetTestingModule());
