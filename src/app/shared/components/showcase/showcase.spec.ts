import { DOCUMENT, Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ShowcaseComponent } from './showcase';

describe('Showcase section navigation', () => {
  it('scrolls within the showcase and preserves its route and query', () => {
    const section = document.createElement('section');
    section.scrollIntoView = vi.fn();
    const replaceState = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: {
            getElementById: () => section,
            defaultView: { matchMedia: () => ({ matches: true }) },
          },
        },
        { provide: Location, useValue: { path: () => '/showcase?preview=1', replaceState } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new ShowcaseComponent());
    const click = new MouseEvent('click', { cancelable: true });
    component.scrollToSection(click, 'standard-actions');
    expect(click.defaultPrevented).toBe(true);
    expect(section.scrollIntoView).toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith('/showcase?preview=1#standard-actions');
  });

  it('allows modified clicks to use the normal link destination', () => {
    const replaceState = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: Location, useValue: { path: () => '/showcase', replaceState } }],
    });
    const component = TestBed.runInInjectionContext(() => new ShowcaseComponent());
    const click = new MouseEvent('click', { cancelable: true, ctrlKey: true });
    component.scrollToSection(click, 'standard-fields');
    expect(click.defaultPrevented).toBe(false);
    expect(replaceState).not.toHaveBeenCalled();
  });
});
