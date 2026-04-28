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

  it('should initialize form with empty values', () => {
    expect(component.boardForm.get('boardName')?.value).toBe('');
    expect(component.boardForm.get('description')?.value).toBe('');
    expect(component.boardForm.get('status')?.value).toBe('');
  });

  it('should validate required fields', () => {
    const form = component.boardForm;
    expect(form.valid).toBeFalsy();

    form.get('boardName')?.setValue('Test Board');
    form.get('description')?.setValue('Test description');
    form.get('status')?.setValue('active');

    expect(form.valid).toBeTruthy();
  });
});
