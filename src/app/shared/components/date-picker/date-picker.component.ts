import {
  Component,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';

interface CalendarDay {
  date: Date;
  iso: string;
  day: number;
  inCurrentMonth: boolean;
  disabled: boolean;
  today: boolean;
  selected: boolean;
}

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true,
    },
  ],
})
export class DatePickerComponent implements ControlValueAccessor, OnChanges {
  @Input() minDate: string | null = null;
  @Input() maxDate: string | null = null;
  @Input() placeholder = 'Select date';
  @Input() ariaLabel = 'Choose date';
  @Input() includeTime = false;
  @Input() id = '';
  @Input() dateValue: string | null = null;
  @Output() dateValueChange = new EventEmitter<string>();

  value = '';
  disabled = false;
  isOpen = false;
  visibleMonth = this.startOfMonth(new Date());
  timeValue = '09:00';
  readonly overlayPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
  ];
  readonly weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngOnChanges(changes: SimpleChanges): void {
    if ('dateValue' in changes && this.dateValue !== null) {
      this.setValueFromModel(this.dateValue);
      const selected = this.parseIsoDate(this.value);
      if (selected) this.visibleMonth = this.startOfMonth(selected);
    }
  }

  get displayValue(): string {
    const selected = this.parseIsoDate(this.value);
    if (!selected) return '';
    const date = new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(selected);
    if (!this.includeTime) return date;
    const [hours, minutes] = this.timeValue.split(':').map(Number);
    const time = new Date(2000, 0, 1, hours || 0, minutes || 0);
    return `${date}, ${new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(time)}`;
  }

  get monthTitle(): string {
    return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(
      this.visibleMonth,
    );
  }

  get calendarDays(): CalendarDay[] {
    const firstOfMonth = this.startOfMonth(this.visibleMonth);
    const gridStart = new Date(
      firstOfMonth.getFullYear(),
      firstOfMonth.getMonth(),
      1 - firstOfMonth.getDay(),
    );
    const todayIso = this.toIsoDate(new Date());
    const selectedIso = this.value;

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index,
      );
      const iso = this.toIsoDate(date);
      return {
        date,
        iso,
        day: date.getDate(),
        inCurrentMonth: date.getMonth() === this.visibleMonth.getMonth(),
        disabled: (!!this.minDate && iso < this.minDate) || (!!this.maxDate && iso > this.maxDate),
        today: iso === todayIso,
        selected: iso === selectedIso,
      };
    });
  }

  writeValue(value: unknown): void {
    this.setValueFromModel(typeof value === 'string' ? value : '');
    const selected = this.parseIsoDate(this.value);
    if (selected) this.visibleMonth = this.startOfMonth(selected);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) this.isOpen = false;
  }

  openCalendar(): void {
    if (this.disabled) return;
    const selected = this.parseIsoDate(this.value);
    this.visibleMonth = this.startOfMonth(selected ?? new Date());
    this.isOpen = true;
  }

  closeCalendar(): void {
    this.isOpen = false;
    this.onTouched();
  }

  moveMonth(offset: number): void {
    this.visibleMonth = new Date(
      this.visibleMonth.getFullYear(),
      this.visibleMonth.getMonth() + offset,
      1,
    );
  }

  selectDate(day: CalendarDay): void {
    if (day.disabled) return;
    this.value = day.iso;
    this.commitValue();
    if (!this.includeTime) this.closeCalendar();
  }

  updateTime(value: string): void {
    if (!value) return;
    this.timeValue = value;
    if (this.value) this.commitValue();
  }

  clearDate(): void {
    this.value = '';
    this.onChange('');
    this.dateValueChange.emit('');
    this.closeCalendar();
  }

  selectToday(): void {
    const todayIso = this.toIsoDate(new Date());
    if ((this.minDate && todayIso < this.minDate) || (this.maxDate && todayIso > this.maxDate))
      return;
    this.value = todayIso;
    this.commitValue();
    if (!this.includeTime) this.closeCalendar();
  }

  done(): void {
    this.closeCalendar();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) this.closeCalendar();
  }

  private parseIsoDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return this.toIsoDate(date) === value ? date : null;
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private setValueFromModel(value: string): void {
    this.value = value.slice(0, 10);
    const time = value.match(/T(\d{2}:\d{2})/)?.[1];
    if (time) this.timeValue = time;
  }

  private commitValue(): void {
    const value = this.includeTime ? `${this.value}T${this.timeValue}` : this.value;
    this.onChange(value);
    this.dateValueChange.emit(value);
  }
}
