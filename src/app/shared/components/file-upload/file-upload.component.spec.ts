import { afterEach, describe, expect, it, vi } from 'vitest';
import '@angular/compiler';

import { FileUploadComponent } from './file-upload.component';

describe('FileUploadComponent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the Lambda-safe 4 MB default limit', () => {
    const component = new FileUploadComponent();

    expect(component.maxSizeMB).toBe(4);
  });

  it('rejects files larger than 4 MB before upload', () => {
    const component = new FileUploadComponent();
    component.accept = '.pdf';
    const selectedFiles: Array<File | null> = [];
    component.fileSelected.subscribe((file) => selectedFiles.push(file));

    const file = {
      name: 'oversized.pdf',
      size: 4 * 1024 * 1024 + 1,
      type: 'application/pdf',
    } as File;

    (
      component as unknown as {
        processFile(fileToProcess: File): void;
      }
    ).processFile(file);

    expect(component.errorMsg()).toBe('File exceeds 4 MB limit.');
    expect(selectedFiles).toEqual([null]);
  });

  it('shows and clears the selected file preview', () => {
    const component = new FileUploadComponent();
    component.accept = '.pdf';
    const selectedFiles: Array<File | null> = [];
    component.fileSelected.subscribe((file) => selectedFiles.push(file));

    const file = {
      name: 'acceptance-notification.pdf',
      size: 1024,
      type: 'application/pdf',
    } as File;

    (
      component as unknown as {
        processFile(fileToProcess: File): void;
      }
    ).processFile(file);

    expect(component.displayFileName()).toBe('acceptance-notification.pdf');
    expect(component.hasSelectedFile()).toBe(true);

    component.removeSelectedFile();

    expect(component.displayFileName()).toBeNull();
    expect(component.hasSelectedFile()).toBe(false);
    expect(selectedFiles).toEqual([file, null]);
  });

  it('opens the selected file preview URL', () => {
    const component = new FileUploadComponent();
    const openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);

    component.selectedFileUrl.set('blob:preview-url');

    component.openFilePreview();

    expect(openSpy).toHaveBeenCalledWith(
      'blob:preview-url',
      '_blank',
      'noopener,noreferrer',
    );
  });
});
