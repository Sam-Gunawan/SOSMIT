import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Siteinfo } from '../model/siteinfo.model';
import { ApiService } from '../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-site-card',
  imports: [CommonModule],
  templateUrl: './site-card.component.html',
  styleUrl: './site-card.component.scss'
})
export class SiteCardComponent {
  siteCardList: Siteinfo[] = [];  
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(private apiService: ApiService, private route: Router) {}

  ngOnInit(): void {
    this.fetchMySiteCards();
  }

  fetchMySiteCards(): void {
    this.isLoading = true; // Set loading state to true
    this.apiService.getUserSiteCards().subscribe({
      next: (siteCardsList) => {
        this.siteCardList = siteCardsList; // Update the siteCardList with the fetched data
        this.isLoading = false; // Set loading state to false after data is fetched
        console.log('[SiteCard] Site cards fetched successfully:', this.siteCardList);
        console.log('[SiteCard] Site cards type:', typeof this.siteCardList);
      },

      error: (error) => {
        this.errorMessage = 'Failed to fetch site cards. Please try again later.';
        this.isLoading = false;
        console.log('[SiteCard] Error fetching site cards:', error);
      }
    })
  }

  goToSite(id: number): void {
    this.route.navigate(['site', `${id}`])
  }
}
