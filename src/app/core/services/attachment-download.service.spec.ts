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
  it('GETs a preview with the existing bearer, opens a Blob and frees it on close', () => {
    service.open(`${base}/files/folder/paper.pdf`,'paper.pdf',true);
    const req = http.expectOne(`${base}/view-files/folder/paper.pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer existing-token');
    expect(req.request.withCredentials).toBe(false);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF-test'],{type:'application/pdf'}));
    expect(viewer.location.href).toBe('blob:protected-preview');
    expect(viewer.opener).toBeNull();
    viewer.closed=true; vi.advanceTimersByTime(30000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:protected-preview');
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
  it('closes the blank viewer when access fails', () => {
    service.open(`${base}/files/paper.pdf`,'paper.pdf',true);
    http.expectOne(`${base}/view-files/paper.pdf`).flush(new Blob(),{status:403,statusText:'Forbidden'});
    expect(viewer.close).toHaveBeenCalledOnce();
    expect(toast.error).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it('does not send the bearer to an untrusted attachment URL', () => {
    service.open('https://untrusted.example/files/paper.pdf','paper.pdf',true);
    http.expectNone(() => true); expect(open).not.toHaveBeenCalled();
  });
  it('does not fetch when the preview popup is blocked', () => {
    open.mockReturnValue(null);
    service.open(`${base}/files/paper.pdf`,'paper.pdf',true);
    http.expectNone(() => true); expect(toast.error).toHaveBeenCalledOnce();
  });
});
