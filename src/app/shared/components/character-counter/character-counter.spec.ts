import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CharacterCounter } from './character-counter';

describe('CharacterCounter', () => {
  let component: CharacterCounter;
  let fixture: ComponentFixture<CharacterCounter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterCounter],
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCounter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
