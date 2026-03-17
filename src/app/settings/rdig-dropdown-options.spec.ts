import { TestBed } from '@angular/core/testing';

import { RdigDropdownOptions } from './rdig-dropdown-options';

describe('RdigDropdownOptions', () => {
  let service: RdigDropdownOptions;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RdigDropdownOptions);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
