import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AttachmentViewerComponent } from './attachment-viewer.component';
import { authTokenInterceptor } from '../../core/interceptors/auth-token.interceptor';
import { attachmentViewApiUrl, attachmentViewerUrl } from '../../core/services/attachment-viewer-link';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

const path='/view-files/conference/request/paper.txt';
const url=environment.attachmentBaseUrl.replace(/\/$/,'')+path;
function setup(selectedPath=path) {
  localStorage.setItem('token','recipient-own-token');
  TestBed.configureTestingModule({imports:[AttachmentViewerComponent],providers:[
    provideHttpClient(withInterceptors([authTokenInterceptor])),provideHttpClientTesting(),
    {provide:ActivatedRoute,useValue:{queryParamMap:of(convertToParamMap({path:selectedPath,name:'paper.txt'}))}},
    {provide:ToastService,useValue:{error:vi.fn(),success:vi.fn()}},
  ]});
  const fixture=TestBed.createComponent(AttachmentViewerComponent);
  const http=TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return {fixture,http,component:fixture.componentInstance};
}
afterEach(() => { TestBed.resetTestingModule(); localStorage.clear(); });
describe('Shared attachment viewer', () => {
  it('uses the recipient bearer and safely renders text as text, without cookie auth', () => {
    const {component,http,fixture}=setup();
    const req=http.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBe('Bearer recipient-own-token');
    expect(req.request.withCredentials).toBe(false);
    expect(req.request.responseType).toBe('arraybuffer');
    const buffer = new ArrayBuffer(23);
    new Uint8Array(buffer).set(new TextEncoder().encode('<script>unsafe</script>'));
    req.flush(buffer,{headers:{'Content-Type':'text/plain'}});
    fixture.detectChanges();
    expect(component.text()).toBe('<script>unsafe</script>');
    expect(fixture.nativeElement.querySelector('pre').textContent).toBe('<script>unsafe</script>');
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
    http.verify();
  });
  it('shows a familiar message when the recipient cannot access the file', () => {
    const {component,http}=setup();
    http.expectOne(url).flush(new ArrayBuffer(0),{status:404,statusText:'Not Found'});
    expect(component.error()).toContain('do not have permission'); http.verify();
  });
  it('does not send credentials to an arbitrary URL supplied in the shared link', () => {
    const {component,http}=setup('https://untrusted.example/private.pdf');
    expect(component.error()).toContain('invalid'); http.expectNone(() => true);
  });
  it('rejects non-file endpoints and traversal; creates a token-free link for supported file routes', () => {
    for (const value of ['/auth/check','//evil.example/file','/view-files/a/../../auth/check','/view-files/a?token=secret']) expect(attachmentViewApiUrl(value)).toBeNull();
    const link=attachmentViewerUrl(url,'paper.txt')!;
    expect(new URL(link).searchParams.get('path')).toBe(path);
    expect(link).not.toContain('recipient-own-token');
  });
});
