import { Component } from '@angular/core';
import { ApiService } from '../api.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  credentials = {
    username: '',
    password: '',
  };

  errorMessage: string = '';

  constructor(private apiService: ApiService, private router: Router) {}

  login(): void {
    const username = this.credentials.username;
    const password = this.credentials.password;

    // Check if username and password are provided
    if (!username || !password) {
      this.errorMessage = 'Username and password are required.';
      console.log(this.errorMessage); 
      return; 
    }

    if (username && password) {
      // Call the login method from ApiService
      this.apiService.login({ username, password }).subscribe({
        // Handle the successful API call (HTTP 200-299)
        next: (response) => {
          console.log('Login successful:', response);
          // Redirect to the dashboard if successful
          this.router.navigate(['/dashboard']);
        },
        
        // Handle errors gracefully (HTTP 400-599)
        error: (error) => {
          this.errorMessage = 'Login failed. Please check your credentials.';
          console.error('Login error:', error);
        }

      })
    }
  }
}