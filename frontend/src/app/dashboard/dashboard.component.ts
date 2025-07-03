import { Component } from '@angular/core';
import { ApiService } from '../api/api.service';
import { User } from '../model/user.model';
import { titleCase } from '../reusable_functions'; // Import the titleCase function

@Component({
  selector: 'app-dashboard',
  standalone: true, // This component is standalone
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
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
