import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  inject,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';

@Directive({
  selector: 'textarea[appTextareaAutosize]',
  standalone: true,
})
export class TextareaAutosizeDirective implements AfterViewInit, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLTextAreaElement>>(ElementRef);
  private readonly ngControl = inject(NgControl, { optional: true });
  private valueChangesSubscription?: Subscription;

  @Input() minRows = 2;

  ngAfterViewInit(): void {
    this.resize();
    this.valueChangesSubscription = this.ngControl?.valueChanges?.subscribe(() => {
      queueMicrotask(() => this.resize());
    });
  }

  ngOnDestroy(): void {
    this.valueChangesSubscription?.unsubscribe();
  }

  @HostListener('input')
  onInput(): void {
    this.resize();
  }

  private resize(): void {
    const textarea = this.elementRef.nativeElement;
    textarea.style.height = 'auto';
    textarea.style.minHeight = `${this.getMinHeight(textarea)}px`;
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  private getMinHeight(textarea: HTMLTextAreaElement): number {
    const styles = window.getComputedStyle(textarea);
    const parsedLineHeight = Number.parseFloat(styles.lineHeight);
    const fontSize = Number.parseFloat(styles.fontSize);
    const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : fontSize * 1.5;
    const paddingTop = Number.parseFloat(styles.paddingTop);
    const paddingBottom = Number.parseFloat(styles.paddingBottom);
    const borderTop = Number.parseFloat(styles.borderTopWidth);
    const borderBottom = Number.parseFloat(styles.borderBottomWidth);

    return this.minRows * lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
  }
}
