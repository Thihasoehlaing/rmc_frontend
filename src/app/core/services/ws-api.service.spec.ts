import { TestBed } from '@angular/core/testing';

import { WsApi } from './ws-api';

describe('WsApi', () => {
  let service: WsApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WsApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
