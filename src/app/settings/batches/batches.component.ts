import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface BatchCard {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
  route: string;
}

@Component({
  selector: 'app-batches',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './batches.component.html',
  styleUrls: ['./batches.component.scss'],
})
export class BatchesComponent {
  cards: BatchCard[] = [
    {
      id: 1,
      title: 'RDIG Application',
      subtitle: '1 active • 67 submissions',
      icon: 'layers',
      badge: '1 item',
      route: '/settings/batch-sitting',
    },
  ];
}
