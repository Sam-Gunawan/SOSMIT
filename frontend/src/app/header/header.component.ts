import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OpnameSession } from '../model/opname-session.model';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  currentView: 'large' | 'small' = 'large';
  isMobile: boolean = false;
  notif!: OpnameSession;

  notifications = [
    { message: 'New Opname session created...', isRead: false},
    { message: 'Opname session completed...', isRead: true},
  ];

  constructor(private apiService: ApiService) {
  }

  ngOnInit(): void {
    this.checkScreenSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 610; // Define mobile breakpoint
    
    if (this.isMobile) {
      this.currentView = 'small'; // Force list view on mobile
    } else {
      this.currentView = 'large'; // Default to card view on desktop
    }
  }

  logout(): void {
    // Call the logout method from ApiService
    this.apiService.logout();
  }
}
