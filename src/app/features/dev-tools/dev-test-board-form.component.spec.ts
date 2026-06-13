import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { DevTestBoardFormComponent } from './dev-test-board-form.component';

describe('DevTestBoardFormComponent', () => {
  let component: DevTestBoardFormComponent;
  let fixture: ComponentFixture<DevTestBoardFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevTestBoardFormComponent, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(DevTestBoardFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the editor with default modal values', () => {
    expect(component.editorForm.get('title')?.value).toBe('Guidelines for Applicants');
    expect(component.editorForm.get('backgroundToken')?.value).toBe('white');
    expect(component.editorForm.get('buttonText')?.value).toBe('Close');
  });

  it('should validate required fields', () => {
    const form = component.editorForm;
    expect(form.valid).toBeTruthy();

    form.get('title')?.setValue('');
    expect(form.valid).toBeFalsy();

    form.get('title')?.setValue('Updated Guidelines');
    expect(form.valid).toBeTruthy();
  });
});
