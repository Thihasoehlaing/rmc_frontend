import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';

import { JournalPublicationFormComponent } from './journal-publication-form.component';
import { journalPublicationFormRoutes } from './journal_publication_form.routes';

describe('JournalPublicationFormComponent', () => {
  let component: JournalPublicationFormComponent;
  let fixture: ComponentFixture<JournalPublicationFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JournalPublicationFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(JournalPublicationFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the active Journal guideline-by-form API', () => {
    expect(component.guidelinesEndpoint).toBe(
      `${environment.apiUrl}/admin-settings/guidelines/forms/JOURNAL`,
    );
  });

  it('exposes the current design on the primary application route', () => {
    const route = journalPublicationFormRoutes.find(
      (candidate) => candidate.path === 'application',
    );

    expect(route).toBeTruthy();
    expect(route?.data?.['permission']).toBeTruthy();
  });

  it('lists each missing Journal Details field after the step is checked', () => {
    component.onStepClick(2);

    const labels = component.stepStatuses[0].missingFields.map((field) =>
      typeof field === 'string' ? field : field.label,
    );

    expect(labels).toContain('Author Role');
    expect(labels).toContain('Scopus Quartile');
    expect(labels).toContain('Research Type');
    expect(labels).toContain('Restricted Publisher');
    expect(labels).toContain('APU Journal (JATI/EJBM) Citation');
    expect(labels).toContain('Journal Name');
    expect(labels).toContain('Paper Title');
    expect(labels).not.toContain('Please key in 3 SDG keywords');
    expect(labels).not.toContain('Complete Journal Details');
  });
});
