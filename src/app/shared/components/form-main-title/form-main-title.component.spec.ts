import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { FormMainTitleComponent } from './form-main-title.component';

describe('FormMainTitleComponent guideline behavior', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormMainTitleComponent],
      providers: [provideHttpClient()],
    }).compileComponents();
  });

  it('auto-opens guidelines once for a new application', fakeAsync(() => {
    const fixture = TestBed.createComponent(FormMainTitleComponent);
    const component = fixture.componentInstance;
    let openCount = 0;

    fixture.componentRef.setInput('customModal', true);
    fixture.componentRef.setInput('guidelineContext', 'new-application');
    component.helpClick.subscribe(() => openCount++);

    fixture.detectChanges();
    tick();

    expect(openCount).toBe(1);

    fixture.componentRef.setInput('guidelineContext', 'new-application');
    fixture.detectChanges();
    tick();

    expect(openCount).toBe(1);
  }));

  it('auto-opens the standard guidelines modal for a new application', fakeAsync(() => {
    const fixture = TestBed.createComponent(FormMainTitleComponent);
    const component = fixture.componentInstance;
    let openCount = 0;

    fixture.componentRef.setInput('endpoint', 'guidelines/test');
    fixture.componentRef.setInput('guidelineContext', 'new-application');
    fixture.detectChanges();
    component.guidelinesModal.open = () => openCount++;
    tick();

    expect(openCount).toBe(1);
  }));

  it('does not auto-open guidelines for an existing application', fakeAsync(() => {
    const fixture = TestBed.createComponent(FormMainTitleComponent);
    const component = fixture.componentInstance;
    let openCount = 0;

    fixture.componentRef.setInput('customModal', true);
    fixture.componentRef.setInput('guidelineContext', 'existing-application');
    component.helpClick.subscribe(() => openCount++);

    fixture.detectChanges();
    tick();

    expect(openCount).toBe(0);
  }));

  it('cancels a pending automatic open when context changes to existing', fakeAsync(() => {
    const fixture = TestBed.createComponent(FormMainTitleComponent);
    const component = fixture.componentInstance;
    let openCount = 0;

    fixture.componentRef.setInput('customModal', true);
    fixture.componentRef.setInput('guidelineContext', 'new-application');
    component.helpClick.subscribe(() => openCount++);
    fixture.detectChanges();

    fixture.componentRef.setInput('guidelineContext', 'existing-application');
    fixture.detectChanges();
    tick();

    expect(openCount).toBe(0);
  }));

  it('shows the help message only after the automatic popup closes', fakeAsync(() => {
    const fixture = TestBed.createComponent(FormMainTitleComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('customModal', true);
    fixture.componentRef.setInput('guidelineContext', 'new-application');
    fixture.detectChanges();
    tick();

    component.onGuidelinesClosed();
    expect(component.showHelpMessage()).toBe(true);

    tick(3000);
    expect(component.showHelpMessage()).toBe(false);
  }));

  it('keeps manual access without showing the automatic-close message', fakeAsync(() => {
    const fixture = TestBed.createComponent(FormMainTitleComponent);
    const component = fixture.componentInstance;
    let openCount = 0;

    fixture.componentRef.setInput('customModal', true);
    fixture.componentRef.setInput('guidelineContext', 'existing-application');
    component.helpClick.subscribe(() => openCount++);
    fixture.detectChanges();

    component.onHelpClick();
    component.onGuidelinesClosed();
    tick();

    expect(openCount).toBe(1);
    expect(component.showHelpMessage()).toBe(false);
  }));

  it('does not open twice when help is clicked before the automatic popup', fakeAsync(() => {
    const fixture = TestBed.createComponent(FormMainTitleComponent);
    const component = fixture.componentInstance;
    let openCount = 0;

    fixture.componentRef.setInput('customModal', true);
    fixture.componentRef.setInput('guidelineContext', 'new-application');
    component.helpClick.subscribe(() => openCount++);
    fixture.detectChanges();

    component.onHelpClick();
    tick();

    expect(openCount).toBe(1);
  }));
});
