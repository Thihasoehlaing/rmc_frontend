import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResearchActivities } from './research-activities';

describe('ResearchActivities', () => {
  let component: ResearchActivities;
  let fixture: ComponentFixture<ResearchActivities>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResearchActivities],
    }).compileComponents();

    fixture = TestBed.createComponent(ResearchActivities);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
