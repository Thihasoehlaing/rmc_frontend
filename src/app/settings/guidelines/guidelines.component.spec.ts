import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuidelinesComponent } from './guidelines.component';
import { AuthService } from '../../services/auth.service';
import { GuidelineConfig } from './add-guideline-modal/add-guideline-modal.component';

describe('GuidelinesComponent', () => {
  let component: GuidelinesComponent;
  let fixture: ComponentFixture<GuidelinesComponent>;
  let auth: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuidelinesComponent],
    }).compileComponents();

    auth = TestBed.inject(AuthService);
    auth.login('rmc_ahmad', 'rmc123');

    fixture = TestBed.createComponent(GuidelinesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should stamp the logged in user name when creating a guideline', () => {
    const beforeCount = component.guidelines().length;
    const config: GuidelineConfig = {
      title: 'New Guidelines',
      formName: 'Conference Application',
      backgroundToken: 'white',
      textToken: 'var(--color-text-primary)',
      buttonToken: 'var(--color-primary)',
      buttonText: 'Close',
      blocks: [],
    };

    component.saveGuideline(config);

    expect(component.guidelines().length).toBe(beforeCount + 1);
    expect(component.guidelines()[component.guidelines().length - 1].createdBy).toBe('Dr. Ahmad Al-Hassan');
  });

  it('should sort by block count when the blocks column is clicked', () => {
    component.onSortChange('blocks');

    const blockCounts = component.filteredGuidelines().map(g => g.config.blocks.length);

    expect(blockCounts).toEqual([...blockCounts].sort((a, b) => a - b));
  });
});
