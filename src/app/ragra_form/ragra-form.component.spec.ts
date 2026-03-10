import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagraFormComponent } from './ragra-form.component';

describe('RagraFormComponent', () => {
  let component: RagraFormComponent;
  let fixture: ComponentFixture<RagraFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagraFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RagraFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
