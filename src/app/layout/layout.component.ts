import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopHeaderComponent } from './top-header/top-header.component';
import { LayoutStartupService } from '../core/services/layout-startup.service';
import { SidebarService } from '../core/services/sidebar.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopHeaderComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {
  sidebarService = inject(SidebarService);
  private readonly layoutStartup = inject(LayoutStartupService);
  currentYear = new Date().getFullYear();

  ngOnInit(): void {
    this.layoutStartup.start().subscribe();
  }
}
