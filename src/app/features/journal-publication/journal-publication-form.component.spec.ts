import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JournalPublicationFormComponent } from './journal-publication-form.component';

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
});
