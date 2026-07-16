import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: number[];
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss'
})
export class PaginationComponent implements OnChanges {
  @Input() currentPage: number = 1;
  @Input() totalPages: number = 1;
  @Input() pageSize: number = 15;
  @Input() pageSizeOptions: number[] = [5, 15, 30, 50];
  @Input() totalItems: number | null = null;
  @Input() itemCount: number | null = null;
  @Input() itemLabel: string = 'results';

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  pageInput: number = 1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentPage']) {
      this.pageInput = this.currentPage;
    }
  }

  goToPage(page: number) {
    const nextPage = this.clampPage(page);
    this.pageInput = nextPage;
    if (nextPage !== this.currentPage) this.pageChange.emit(nextPage);
  }

  onPageSizeChange(newSize: number) {
    this.pageSizeChange.emit(newSize);
  }

  onPageInputChange(value: number | null): void {
    this.pageInput = this.clampPage(value ?? 1);
  }

  submitPageInput(): void {
    this.goToPage(this.pageInput);
  }

  private clampPage(page: number): number {
    const maxPage = Math.max(1, this.totalPages || 1);
    const normalized = Number.isFinite(page) ? Math.trunc(page) : 1;
    return Math.min(Math.max(normalized, 1), maxPage);
  }

  get visiblePages(): number[] {
    if (this.totalPages <= 5) {
      return Array.from({ length: this.totalPages }, (_, index) => index + 1);
    }

    if (this.currentPage <= 3) {
      return [1, 2, 3, -1, this.totalPages];
    }

    if (this.currentPage >= this.totalPages - 2) {
      return [1, -1, this.totalPages - 2, this.totalPages - 1, this.totalPages];
    }

    return [
      1,
      -1,
      this.currentPage - 1,
      this.currentPage,
      this.currentPage + 1,
      -2,
      this.totalPages,
    ];
  }
}
