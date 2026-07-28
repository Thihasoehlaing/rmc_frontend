import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: 'input[appDecimalAmount]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DecimalAmountDirective),
      multi: true,
    },
  ],
})
export class DecimalAmountDirective implements ControlValueAccessor {
  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor(private readonly elementRef: ElementRef<HTMLInputElement>) {}

  @HostListener('input', ['$event'])
  handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cursorPosition = input.selectionStart ?? input.value.length;
    const valueBeforeCursor = input.value.slice(0, cursorPosition).replaceAll(',', '');
    const normalizedValue = this.normalize(input.value);

    input.value = this.format(normalizedValue);
    this.restoreCursor(input, valueBeforeCursor);
    this.onChange(this.toNumber(normalizedValue));
  }

  @HostListener('blur')
  handleBlur(): void {
    const input = this.elementRef.nativeElement;
    const value = this.toNumber(this.normalize(input.value));

    input.value = value === null ? '' : this.format(value.toFixed(2));
    this.onChange(value);
    this.onTouched();
  }

  writeValue(value: number | string | null | undefined): void {
    const numericValue =
      value === null || value === undefined || value === ''
        ? null
        : Number(String(value).replaceAll(',', ''));

    this.elementRef.nativeElement.value =
      numericValue !== null && Number.isFinite(numericValue)
        ? this.format(numericValue.toFixed(2))
        : '';
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.elementRef.nativeElement.disabled = isDisabled;
  }

  private normalize(value: string): string {
    const sanitized = value.replaceAll(',', '').replace(/[^\d.]/g, '');
    const [integerPart = '', ...decimalParts] = sanitized.split('.');
    const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '');

    if (decimalParts.length === 0) {
      return normalizedInteger;
    }

    return `${normalizedInteger || '0'}.${decimalParts.join('').slice(0, 2)}`;
  }

  private format(value: string): string {
    if (!value) {
      return '';
    }

    const [integerPart, decimalPart] = value.split('.');
    const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return decimalPart === undefined ? groupedInteger : `${groupedInteger}.${decimalPart}`;
  }

  private toNumber(value: string): number | null {
    if (!value || value === '.') {
      return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  private restoreCursor(input: HTMLInputElement, valueBeforeCursor: string): void {
    let targetPosition = 0;

    if (valueBeforeCursor.includes('.')) {
      const decimalDigits = valueBeforeCursor.split('.')[1]?.replace(/\D/g, '').length ?? 0;
      const decimalPointPosition = input.value.indexOf('.');
      targetPosition =
        decimalPointPosition === -1
          ? input.value.length
          : Math.min(decimalPointPosition + decimalDigits + 1, input.value.length);
    } else {
      const integerDigits = valueBeforeCursor.replace(/\D/g, '').length;
      let digitsSeen = 0;

      while (targetPosition < input.value.length && digitsSeen < integerDigits) {
        if (/\d/.test(input.value[targetPosition])) {
          digitsSeen += 1;
        }
        targetPosition += 1;
      }
    }

    input.setSelectionRange(targetPosition, targetPosition);
  }
}
