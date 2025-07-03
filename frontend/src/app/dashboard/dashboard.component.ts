import { Component } from '@angular/core';
import { ApiService } from '../services/api.service';
import { CommonModule } from '@angular/common';
import { SiteCardComponent } from '../site-card/site-card.component';
import { Siteinfo } from '../model/siteinfo.model';
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
  siteCardList: Siteinfo[] = [];  
  isLoading: boolean = true;
  errorMessage: string = '';
  loggedInUser: User = new User(); // Initialize with a new User instance
  
  constructor(private apiService: ApiService) {
    // Default value for firstName
    this.loggedInUser.firstName = 'John Doe'; // TODO: get the user's name from API
  }

  ngOnInit(): void {
    // Fetch the logged-in user's profile when the component initializes
    this.fetchMyProfile();
    this.fetchMySiteCards();
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

  fetchMySiteCards(): void {
    this.isLoading = true; // Set loading state to true
    this.apiService.getUserSiteCards().subscribe({
      next: (siteCardsList) => {
        this.siteCardList = siteCardsList; // Update the siteCardList with the fetched data
        this.isLoading = false; // Set loading state to false after data is fetched
        console.log('[Dashboard] Site cards fetched successfully:', this.siteCardList);
        console.log('[Dashboard] Site cards type:', typeof this.siteCardList);

        // // Modify the date format for each site card using custom function.
        // this.siteCardList.forEach(siteCard => {
        //   // siteCard.opnameDate is already a Date object from the API response.
        //   if (siteCard.opnameDate) {
        //     // Format the date to a more readable format, e.g., 'dd MMM yyyy'
        //     siteCard.opnameDate = formatDate(siteCard.opnameDate);
        //   } else {
        //     console.warn('[Dashboard] Opname date is undefined for site:', siteCard.siteName);
        //     siteCard.opnameDate = new Date(1945, 7, 17); // Months are 0-indexed: 7 = August
        //   }
        // });

      },

      error: (error) => {
        this.errorMessage = 'Failed to fetch site cards. Please try again later.';
        this.isLoading = false;
        console.log('[Dashboard] Error fetching site cards:', error);
      }
    })
  }

  logout(): void {
    // Call the logout method from ApiService
    this.apiService.logout();
  }
}
