import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConferenceFormComponent } from './conference-form.component';

describe('ConferenceFormComponent', () => {
  let component: ConferenceFormComponent;
  let fixture: ComponentFixture<ConferenceFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConferenceFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConferenceFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
