import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelAuthorizationApplicationComponent } from './travel-authorization-application.component';

describe('TravelAuthorizationApplicationComponent', () => {
  let component: TravelAuthorizationApplicationComponent;
  let fixture: ComponentFixture<TravelAuthorizationApplicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravelAuthorizationApplicationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TravelAuthorizationApplicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
