import { Component } from '@angular/core';
import { ApiService } from '../api/api.service';
import { CommonModule } from '@angular/common';
import { SiteCardComponent } from '../site-card/site-card.component';
import { Siteinfo } from '../siteinfo';
import { User } from '../model/user.model';
import { titleCase } from '../reusable_functions'; // Import the titleCase function

@Component({
  selector: 'app-dashboard',
  standalone: true, // This component is standalone
  imports: [CommonModule, SiteCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  siteCardList: Siteinfo[] = [
    {
      siteID: 1,
      siteName: 'Site A',
      siteLocation: 'Region 1',
      siteGA: 'GA123',
      opnameStatus: 'active',
      opnameDate: '2023-10-01'
    },
    {
      siteID: 2,
      siteName: 'Site B',
      siteLocation: 'Region 2',
      siteGA: 'GA456',
      opnameStatus: 'completed',
      opnameDate: '2023-10-05'
    },
    {
      siteID: 3,
      siteName: 'Site C',
      siteLocation: 'Region 3',
      siteGA: 'GA789',
      opnameStatus: 'pending',
      opnameDate: '2023-10-10'
    },
    {
      siteID: 4,
      siteName: 'Site D',
      siteLocation: 'Region 4',
      siteGA: 'GA101',
      opnameStatus: 'verfified',
      opnameDate: '2023-10-15'
    },
    {
      siteID: 5,
      siteName: 'Site E',
      siteLocation: 'Region 5',
      siteGA: 'GA112',
      opnameStatus: 'rejected',
      opnameDate: '2023-10-20'
    },
    {
      siteID: 6,
      siteName: 'Site F',
      siteLocation: 'Region 6',
      siteGA: 'GA131',
      opnameStatus: 'outdated',
      opnameDate: '2023-10-25'
    }
  ];  
  
  errorMessage: string = '';
  loggedInUser: User = new User(); // Initialize with a new User instance
  
  constructor(private apiService: ApiService) {
    // Default value for firstName
    this.loggedInUser.firstName = 'John Doe'; // TODO: get the user's name from API
  }

  ngOnInit(): void {
    // Fetch the logged-in user's profile when the component initializes
    this.fetchMyProfile();
  }

  fetchMyProfile(): void {
    // Call the getUserProfile method from ApiService
    // Only calls for the logged-in user's profile which is at `/api/user/me`
    this.apiService.getUserProfile('me').subscribe({
      next: (user) => {
        // Update the logged-in user with the fetched profile.
        this.loggedInUser.firstName = titleCase(user["first_name"]);
        // TODO: Fetch and store more necessary data later on...
      },

      // Handle errors gracefully (HTTP 400-599)
      error: (error) => {
        this.errorMessage = "User's profile not found.";
        console.error('[Dashboard] Failed to fetch user profile:', error);
      }
    });
  }

  logout(): void {
    // Call the logout method from ApiService
    this.apiService.logout();
  }
}
