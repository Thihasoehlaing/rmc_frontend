import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinalDeclaration } from './final-declaration';

describe('FinalDeclaration', () => {
  let component: FinalDeclaration;
  let fixture: ComponentFixture<FinalDeclaration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinalDeclaration],
    }).compileComponents();

    fixture = TestBed.createComponent(FinalDeclaration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
