import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OpnameSession } from '../model/opname-session.model';
import { ApiService } from '../services/api.service';
import { User } from '../model/user.model';

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
  showLogoutConfirmation = false;
  loggedInUser: User & { fullName: string } = {} as User & { fullName: '' }; // User object with full name

  notifications = [
    { message: 'New Opname session created...', isRead: false},
    { message: 'Opname session completed...', isRead: true},
  ];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.checkScreenSize();
    this.fetchLoggedInUserProfile();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  private fetchLoggedInUserProfile(): void {
    this.apiService.getUserProfile('me').subscribe(
      (user: User) => {
        this.loggedInUser = { ...user, fullName: `${user.firstName} ${user.lastName}` };
      },
      (error) => {
        console.error('Error fetching user profile:', error);
      }
    );
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
