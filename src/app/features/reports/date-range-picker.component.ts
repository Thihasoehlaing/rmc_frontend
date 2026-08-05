import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface CalendarDay {
  date: Date;
  day: number;
  iso: string;
  inCurrentMonth: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isInRange: boolean;
  isToday: boolean;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

@Component({
  selector: 'app-report-date-range-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-range-picker.component.html',
  styleUrl: './date-range-picker.component.scss',
})
export class ReportDateRangePickerComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly dateFromValue = signal('');
  private readonly dateToValue = signal('');

  @Input() disabled = false;
  @Input()
  set dateFrom(value: string) {
    const next = value ?? '';
    this.dateFromValue.set(next);
    if (next) {
      this.viewDate.set(this.startOfMonth(this.parseIsoDate(next)));
    }
  }
  get dateFrom(): string {
    return this.dateFromValue();
  }

  @Input()
  set dateTo(value: string) {
    this.dateToValue.set(value ?? '');
  }
  get dateTo(): string {
    return this.dateToValue();
  }

  @Output() dateFromChange = new EventEmitter<string>();
  @Output() dateToChange = new EventEmitter<string>();

  readonly weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  readonly isOpen = signal(false);
  readonly viewDate = signal(this.startOfMonth(new Date()));
  readonly calendarDays = computed(() => this.buildCalendarDays(this.viewDate()));

  get displayValue(): string {
    if (this.dateFrom && this.dateTo) {
      return `${this.formatForDisplay(this.dateFrom)} - ${this.formatForDisplay(this.dateTo)}`;
    }

    if (this.dateFrom) {
      return `${this.formatForDisplay(this.dateFrom)} -`;
    }

    return '';
  }

  get monthLabel(): string {
    return MONTH_NAMES[this.viewDate().getMonth()];
  }

  get yearLabel(): number {
    return this.viewDate().getFullYear();
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }

  toggleCalendar(): void {
    if (this.disabled) return;
    this.isOpen.update((open) => !open);
  }

  openCalendar(): void {
    if (this.disabled) return;
    this.isOpen.set(true);
  }

  previousMonth(event: Event): void {
    event.stopPropagation();
    this.viewDate.update((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1));
  }

  nextMonth(event: Event): void {
    event.stopPropagation();
    this.viewDate.update((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1));
  }

  selectDay(day: CalendarDay): void {
    if (this.disabled) return;

    if (!this.dateFrom || this.dateTo || day.iso < this.dateFrom) {
      this.dateFromChange.emit(day.iso);
      this.dateToChange.emit('');
      return;
    }

    this.dateToChange.emit(day.iso);
  }

  private buildCalendarDays(monthDate: Date): CalendarDay[] {
    const monthStart = this.startOfMonth(monthDate);
    const firstGridDate = this.addDays(monthStart, -monthStart.getDay());
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const visibleDayCount = monthStart.getDay() + monthEnd.getDate() <= 35 ? 35 : 42;
    const todayIso = this.toIsoDate(new Date());
    const dateFrom = this.dateFromValue();
    const dateTo = this.dateToValue();
    const hasRange = Boolean(dateFrom && dateTo);

    return Array.from({ length: visibleDayCount }, (_value, index) => {
      const date = this.addDays(firstGridDate, index);
      const iso = this.toIsoDate(date);

      return {
        date,
        day: date.getDate(),
        iso,
        inCurrentMonth: date.getMonth() === monthStart.getMonth(),
        isRangeStart: Boolean(dateFrom && iso === dateFrom),
        isRangeEnd: Boolean(dateTo && iso === dateTo),
        isInRange: hasRange ? iso >= dateFrom && iso <= dateTo : Boolean(dateFrom && iso === dateFrom),
        isToday: iso === todayIso,
      };
    });
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  private parseIsoDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatForDisplay(value: string): string {
    const date = this.parseIsoDate(value);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}/${date.getFullYear()}`;
  }
}
