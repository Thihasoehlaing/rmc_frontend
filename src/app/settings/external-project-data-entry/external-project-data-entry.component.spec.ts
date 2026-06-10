import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExternalProjectDataEntryComponent } from './external-project-data-entry.component';

describe('ExternalProjectDataEntryComponent', () => {
  let component: ExternalProjectDataEntryComponent;
  let fixture: ComponentFixture<ExternalProjectDataEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExternalProjectDataEntryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExternalProjectDataEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});