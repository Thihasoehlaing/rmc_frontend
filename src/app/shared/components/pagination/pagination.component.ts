import { Component, Input, Output, EventEmitter } from '@angular/core';
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
export class PaginationComponent {
  @Input() currentPage: number = 1;
  @Input() totalPages: number = 1;
  @Input() pageSize: number = 15;
  @Input() pageSizeOptions: number[] = [5, 15, 30, 50];

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  onPageSizeChange(newSize: number) {
    this.pageSizeChange.emit(newSize);
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
