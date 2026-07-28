import { describe, expect, it } from 'vitest';
import '@angular/compiler';

import { FileUploadComponent } from './file-upload.component';

describe('FileUploadComponent', () => {
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
});
