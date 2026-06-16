import { TestBed } from '@angular/core/testing';

import { Acl } from './acl';

describe('Acl', () => {
  let service: Acl;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Acl);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
