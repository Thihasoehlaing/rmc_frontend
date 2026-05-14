import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: number[];
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss'
})
export class PaginationComponent {
  @Input() currentPage: number = 1;
  @Input() totalPages: number = 1;
  @Input() pageSize: number = 15;
  @Input() pageSizeOptions: number[] = [5, 15, 30, 50];

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  selectedPageSize = signal(this.pageSize);

  ngOnInit() {
    this.selectedPageSize.set(this.pageSize);
  }

  ngOnChanges() {
    this.selectedPageSize.set(this.pageSize);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  onPageSizeChange(newSize: number) {
    this.selectedPageSize.set(newSize);
    this.pageSizeChange.emit(newSize);
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const range = 2;

    // Always show first page
    if (this.totalPages > 0) {
      pages.push(1);
    }

    // Add range around current page
    const start = Math.max(2, this.currentPage - range);
    const end = Math.min(this.totalPages - 1, this.currentPage + range);

    if (start > 2) pages.push(-1); // Ellipsis indicator

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < this.totalPages - 1) pages.push(-1); // Ellipsis indicator

    // Always show last page
    if (this.totalPages > 1) {
      pages.push(this.totalPages);
    }

    return pages;
  }
}
