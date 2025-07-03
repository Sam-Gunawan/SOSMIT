import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // This service will handle API calls, such as login, fetching data, etc.
  private authApiUrl = 'http://localhost:8080/api/auth'
  private userApiUrl = 'http://localhost:8080/api/user'

  constructor(private http: HttpClient, private router: Router) {}
  login(credentials: {username: string, password: string}): Observable<any> {
    return this.http.post(`${this.authApiUrl}/login`, credentials).pipe(
      // Handle the response here if needed.
      // The 'tap' operator can be used to perform side effects without modifying the response.
      // Side effects meaning actions that you perform with the response, like storing tokens.
      tap((response: any) => {
        // Here, we store the JWT token in localStorage so users can stay logged in.
        // If the login is successful and we receive a token...
        if (response && response.token) {
          // ...store the token in localStorage.
          localStorage.setItem('auth_token', response.token);
        }
      })
    );
  }

  logout(): void {
    // This method will simply remove the token from localStorage.
    localStorage.removeItem('auth_token');
    
    // Then, redirect to login page.
    this.router.navigate(['/login']);
  }

  getUserProfile(username: string): Observable<any> {
    // This method will fetch the user profile data.
    // Authorization header is already handled by AuthInterceptor at ../services/auth.interceptor.ts
    return this.http.get(`${this.userApiUrl}/${username}`);
  }
}
