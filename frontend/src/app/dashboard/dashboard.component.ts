import { Component } from '@angular/core';
import { ApiService } from '../services/api.service';
import { CommonModule } from '@angular/common';
import { SiteCardComponent } from '../site-card/site-card.component';
import { SiteInfo } from '../model/site-info.model';
import { User } from '../model/user.model';
import { titleCase, formatDate } from '../reusable_functions'; // Import the titleCase function

@Component({
  selector: 'app-dashboard',
  standalone: true, // This component is standalone
  imports: [CommonModule, SiteCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  isLoading: boolean = true;
  errorMessage: string = '';
  loggedInUser: User;
  showToast: boolean = false;
  
  constructor(private apiService: ApiService) {
    this.loggedInUser = {
      userID: -1,
      username: 'N/A',
      email: 'N/A',
      firstName: 'N/A',
      lastName: 'N/A',
      position: 'N/A',
      siteID: -1,
      siteName: 'N/A',
      siteGroupName: 'N/A',
      regionName: 'N/A',
      costCenterID: -1
    };
  }

  ngOnInit(): void {
    // Fetch the logged-in user's profile when the component initializes
    console.log('[Dashboard] Initializing DashboardComponent...');
    this.fetchMyProfile();
  }

  fetchMyProfile(): void {
    // Call the getUserProfile method from ApiService
    // Only calls for the logged-in user's profile which is at `/api/user/me`
    this.isLoading = true; // Set loading state to true
    this.errorMessage = ''; // Reset error message
    this.apiService.getUserProfile('me').subscribe({
      next: (user) => {
        // Update the logged-in user with the fetched profile.
        this.loggedInUser = user;
        this.isLoading = false; // Set loading state to false
        // TODO: Fetch and store more necessary data later on...
      },

      // Handle errors gracefully (HTTP 400-599)
      error: (error) => {
        this.errorMessage = "User's profile not found.";
        this.isLoading = false; // Set loading state to false
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
        console.error('[Dashboard] Failed to fetch user profile:', error);
      }
    });
  }
}
