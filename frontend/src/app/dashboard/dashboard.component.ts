import { Component } from '@angular/core';
import { ApiService } from '../api.service';
import { CommonModule } from '@angular/common';
import { SiteCardComponent } from '../site-card/site-card.component';
import { Siteinfo } from '../siteinfo';

@Component({
  selector: 'app-dashboard',
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
  
  constructor(private apiService: ApiService) {}

  logout(): void {
    // Call the logout method from ApiService
    this.apiService.logout();
  }
}
