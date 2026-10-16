import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentDownloadService } from './attachment-download.service';
import { ToastService } from './toast.service';
import { authTokenInterceptor } from '../interceptors/auth-token.interceptor';
import { environment } from '../../../environments/environment';

describe('Bearer attachment viewing', () => {
  let service: AttachmentDownloadService;
  let http: HttpTestingController;
  let viewer: any;
  let open: ReturnType<typeof vi.fn>;
  const toast = {error:vi.fn()};
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;
  const base = environment.attachmentBaseUrl.replace(/\/$/, '');
  beforeEach(() => {
    vi.useFakeTimers();
    viewer = {closed:false, opener:null, document:{title:'',body:{textContent:''}},location:{href:''},close:vi.fn()};
    open = vi.fn(() => viewer);
    vi.stubGlobal('open',open);
    URL.createObjectURL = vi.fn(() => 'blob:protected-preview');
    URL.revokeObjectURL = vi.fn();
    localStorage.setItem('token','existing-token');
    TestBed.configureTestingModule({providers:[
      provideHttpClient(withInterceptors([authTokenInterceptor])), provideHttpClientTesting(),
      {provide:ToastService,useValue:toast},
    ]});
    service = TestBed.inject(AttachmentDownloadService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    window.dispatchEvent(new Event('pagehide'));
    http.verify(); TestBed.resetTestingModule(); localStorage.clear();
    vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
    URL.createObjectURL = create; URL.revokeObjectURL = revoke; toast.error.mockClear();
  });
  it('opens a shareable frontend page without a token or fetching in the original tab', () => {
    service.open(`${base}/files/folder/paper.pdf`,'paper.pdf',true);
    http.expectNone(() => true);
    const opened = new URL(open.mock.calls[0][0]);
    expect(opened.origin).toBe(window.location.origin);
    expect(opened.pathname).toBe('/attachments/view');
    expect(opened.searchParams.get('path')).toBe('/view-files/folder/paper.pdf');
    expect(opened.searchParams.get('name')).toBe('paper.pdf');
    expect(opened.href).not.toContain('existing-token');
    expect(opened.href).not.toContain('blob:');
  });
  it('downloads through the same bearer flow without opening a viewer', () => {
    vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(() => {});
    service.open(`${base}/files/folder/paper.pdf`,'paper.pdf');
    const req=http.expectOne(`${base}/files/folder/paper.pdf`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer existing-token');
    req.flush(new Blob(['test']));
    expect(open).not.toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });
  it('does not send the bearer to an untrusted attachment URL', () => {
    service.open('https://untrusted.example/files/paper.pdf','paper.pdf',true);
    http.expectNone(() => true); expect(open).not.toHaveBeenCalled();
  });
});
