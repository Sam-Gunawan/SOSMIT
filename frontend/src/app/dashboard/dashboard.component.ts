import { Component } from '@angular/core';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  constructor(private apiService: ApiService) {}

  logout(): void {
    // Call the logout method from ApiService
    this.apiService.logout();
  }
}
