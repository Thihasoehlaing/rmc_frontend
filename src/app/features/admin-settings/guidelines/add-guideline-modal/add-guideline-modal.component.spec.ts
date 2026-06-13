import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddGuidelineModalComponent } from './add-guideline-modal.component';

describe('AddGuidelineModalComponent', () => {
  let component: AddGuidelineModalComponent;
  let fixture: ComponentFixture<AddGuidelineModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddGuidelineModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddGuidelineModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
