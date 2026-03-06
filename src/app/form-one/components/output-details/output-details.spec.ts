import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutputDetails } from './output-details';

describe('OutputDetails', () => {
  let component: OutputDetails;
  let fixture: ComponentFixture<OutputDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OutputDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(OutputDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
