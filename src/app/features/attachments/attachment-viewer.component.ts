import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { attachmentViewApiUrl } from '../../core/services/attachment-viewer-link';
import { AttachmentDownloadService } from '../../core/services/attachment-download.service';
import { ActionLoadingService } from '../../core/services/action-loading.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-attachment-viewer', standalone: true,
  templateUrl: './attachment-viewer.component.html', styleUrl: './attachment-viewer.component.scss',
})
export class AttachmentViewerComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly downloadService = inject(AttachmentDownloadService);
  private readonly loading = inject(ActionLoadingService);
  private readonly toast = inject(ToastService);
  @ViewChild('canvas', {static:true}) canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('viewport', {static:true}) viewport!: ElementRef<HTMLElement>;
  readonly name = signal('Attachment');
  readonly error = signal('');
  readonly isPdf = signal(false);
  readonly rendering = signal(false);
  readonly page = signal(1);
  readonly pages = signal(0);
  readonly zoom = signal(100);
  readonly text = signal<string | null>(null);
  private apiUrl: string | null = null;
  private document?: PDFDocumentProxy;
  private task?: PDFDocumentLoadingTask;
  private renderTask?: RenderTask;
  private fetchSubscription?: Subscription;
  private routeSubscription?: Subscription;
  private action?: number;
  private generation = 0;

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParamMap.subscribe(params => {
      this.apiUrl = attachmentViewApiUrl(params.get('path') || '');
      this.name.set(params.get('name') || 'Attachment');
      this.load();
    });
  }
  load(): void {
    this.reset();
    if (!this.apiUrl) { this.error.set('This attachment link is invalid. Open the attachment again from RMC.'); return; }
    const generation = this.generation;
    this.action = this.loading.begin('Loading');
    this.fetchSubscription = this.http.get(this.apiUrl, {responseType:'arraybuffer', observe:'response'}).subscribe({
      next: response => { void this.show(response.body!, response.headers.get('Content-Type') || '', generation); },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.status === 401 ? 'Please sign in again to view this attachment.' : error.status === 403 || error.status === 404 ? 'This attachment is unavailable or you do not have permission to view it.' : 'We could not load this attachment. Please try again.');
        this.finish(generation);
      },
    });
  }
  private async show(buffer: ArrayBuffer, type: string, generation: number): Promise<void> {
    try {
      const bytes = new Uint8Array(buffer);
      if (type.includes('application/pdf') || new TextDecoder().decode(bytes.slice(0,5)) === '%PDF-') {
        const pdf = await import('pdfjs-dist');
        if (generation !== this.generation) return;
        const assets = new URL('assets/pdfjs/', document.baseURI).href;
        pdf.GlobalWorkerOptions.workerSrc = assets + 'pdf.worker.mjs';
        this.task = pdf.getDocument({data:bytes, cMapUrl:assets+'cmaps/', cMapPacked:true, standardFontDataUrl:assets+'standard_fonts/', wasmUrl:assets+'wasm/'});
        const pdfDocument = await this.task.promise;
        if (generation !== this.generation) return;
        this.document = pdfDocument;
        this.pages.set(pdfDocument.numPages); this.isPdf.set(true);
        await this.renderPage(generation);
      } else if (['image/png','image/jpeg','image/gif','image/webp'].some(mime => type.includes(mime))) {
        const image = await createImageBitmap(new Blob([buffer],{type}));
        if (generation !== this.generation) { image.close(); return; }
        const canvas = this.canvas.nativeElement;
        const ratio = Math.min(1, Math.max(1,this.viewport.nativeElement.clientWidth-32)/image.width);
        canvas.width = Math.round(image.width*ratio); canvas.height = Math.round(image.height*ratio);
        canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height); image.close();
      } else if (type.includes('text/plain')) { this.text.set(new TextDecoder().decode(bytes)); }
      else { this.error.set('This file cannot be previewed. Use Download to open it.'); }
    } catch {
      if (generation === this.generation) this.error.set('We could not display this file. Try again or use Download.');
    } finally { this.finish(generation); }
  }
  async turnPage(offset: number): Promise<void> {
    if (this.rendering() || !this.document) return;
    const page = this.page()+offset;
    if (page < 1 || page > this.pages()) return;
    this.page.set(page); await this.renderPage(this.generation);
  }
  async changeZoom(offset: number): Promise<void> {
    if (this.rendering() || !this.document) return;
    this.zoom.set(Math.min(200,Math.max(50,this.zoom()+offset)));
    await this.renderPage(this.generation);
  }
  private async renderPage(generation: number): Promise<void> {
    if (!this.document) return;
    this.rendering.set(true);
    try {
      const page = await this.document.getPage(this.page());
      if (generation !== this.generation) return;
      const original = page.getViewport({scale:1});
      const width = Math.max(1,this.viewport.nativeElement.clientWidth-32);
      const scale = Math.min(2,width/original.width)*this.zoom()/100;
      const view = page.getViewport({scale});
      const canvas = this.canvas.nativeElement;
      const density = Math.min(window.devicePixelRatio || 1,2);
      canvas.width = Math.ceil(view.width*density); canvas.height = Math.ceil(view.height*density);
      canvas.style.width = view.width+'px'; canvas.style.height = view.height+'px';
      this.renderTask = page.render({canvas, viewport:view, transform:density === 1 ? undefined : [density,0,0,density,0,0]});
      await this.renderTask.promise;
    } catch {
      if (generation === this.generation) this.error.set('We could not display this page. Try again or use Download.');
    } finally { if (generation === this.generation) this.rendering.set(false); }
  }
  download(): void { if (this.apiUrl) this.downloadService.open(this.apiUrl,this.name()); }
  async copyLink(): Promise<void> {
    try { await navigator.clipboard.writeText(window.location.href); this.toast.success('Attachment link copied. Recipients must sign in and have access.'); }
    catch { this.toast.error('Please copy the attachment link from the address bar.'); }
  }
  private finish(generation: number): void {
    if (generation === this.generation && this.action != null) { this.loading.end(this.action); this.action=undefined; }
  }
  private reset(): void {
    this.generation++; this.fetchSubscription?.unsubscribe(); this.renderTask?.cancel();
    if (this.task) void this.task.destroy().catch(() => {});
    this.task=undefined; this.document=undefined;
    if (this.action != null) this.loading.end(this.action);
    this.action=undefined; this.error.set(''); this.text.set(null); this.isPdf.set(false);
    this.page.set(1); this.pages.set(0); this.zoom.set(100); this.rendering.set(false);
    const canvas=this.canvas.nativeElement; canvas.width=0; canvas.height=0; canvas.style.width=''; canvas.style.height='';
  }
  ngOnDestroy(): void { this.routeSubscription?.unsubscribe(); this.reset(); }
}
