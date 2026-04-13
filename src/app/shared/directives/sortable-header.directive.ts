import { Directive, HostListener, Input, Output, EventEmitter, HostBinding } from '@angular/core';

export interface TableHeaderClickEvent {
  columnName: string;
}

@Directive({
  selector: '[appSortableHeader]',
  standalone: true
})
export class SortableHeaderDirective {
  @Input() appSortableHeader: string = ''; // column name
  @Input() isSorted = false;
  @Input() sortDirection: 'asc' | 'desc' | null = null;
  @Output() headerClick = new EventEmitter<TableHeaderClickEvent>();

  @HostBinding('class.sortable-header') hasSortableClass = true;
  @HostBinding('class.is-sorted') get isSortedClass() {
    return this.isSorted;
  }

  @HostListener('click')
  onClick(): void {
    this.headerClick.emit({ columnName: this.appSortableHeader });
  }

  constructor() {
    // Set cursor to pointer to indicate clickable
  }
}
