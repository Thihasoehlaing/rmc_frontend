import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface StaffAccessCard {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
}

@Component({
  selector: 'app-staff-access',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './staff-access.component.html',
  styleUrls: ['./staff-access.component.scss'],
})
export class StaffAccessComponent {
  cards: StaffAccessCard[] = [
    { id: 1, title: 'Conference Application', subtitle: '1 blocked staff member', icon: 'person_off', badge: '1 item' },
    { id: 2, title: 'Journal Application', subtitle: '1 blocked staff member', icon: 'person_off', badge: '1 item' },
    { id: 3, title: 'Partnership Application', subtitle: '1 blocked staff member', icon: 'person_off', badge: '1 item' },
    { id: 4, title: 'RA/GRA Application', subtitle: '1 blocked staff member', icon: 'person_off', badge: '1 item' },
    { id: 5, title: 'RDIG Application', subtitle: '1 blocked staff member', icon: 'person_off', badge: '1 item' },
  ];
}
