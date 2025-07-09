import { Component, input } from '@angular/core';
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
  filteredSiteCardList: Siteinfo[] = []; 
  isLoading: boolean = true;
  errorMessage: string = '';
  filter = input<string>(''); // Input property to filter site cards

  constructor(private apiService: ApiService, private route: Router) {}

  ngOnInit(): void {
    // console.log('[SiteCard] ngOnInit called');
    this.fetchMySiteCards();
    console.log('[SiteCard] Initial siteCardList:', this.siteCardList);
    console.log('[SiteCard] Initial filteredSiteCardList:', this.filteredSiteCardList);
  }

  fetchMySiteCards(): void {
    console.log('[SiteCard] fetchMySiteCards called');
    this.isLoading = true; // Set loading state to true
    this.apiService.getUserSiteCards().subscribe({
      next: (siteCardsList) => {
        this.siteCardList = siteCardsList; // Update the siteCardList with the fetched data
        this.isLoading = false; // Set loading state to false after data is fetched
        console.log('[SiteCard] Site cards fetched successfully:', this.siteCardList);
        console.log('[SiteCard] Site cards length:', this.siteCardList.length);
        console.log('[SiteCard] Site cards type:', typeof this.siteCardList);
        this.filteredSiteCardList = this.siteCardList; // Initialize filteredSiteCardList with the full list
      },

      error: (error) => {
        this.errorMessage = 'Failed to fetch your sites. Please try again later.';
        this.isLoading = false;
        console.log('[SiteCard] Error fetching site cards:', error);
      }
    })
  }

  // TODO: make a new filteredSiteCardList variable to store the filtered results
  // and use it in the template instead of siteCardList.

  filterSiteCards(filterValue: string, filterByStatus: boolean = false): void {
    console.log('[SiteCard] filterSiteCards called with value:', filterValue);
    if (filterValue) {
      // Split the filter value by spaces and remove empty strings
      const searchWords = filterValue.toLowerCase().split(' ').filter(word => word.length > 0);
      
      this.filteredSiteCardList = this.siteCardList.filter(site => {
        const siteName = site.siteName.toLowerCase();
        // Check if all search words are present in the site name
        return searchWords.every(word => siteName.includes(word));
      });
    } else {
      this.filteredSiteCardList = this.siteCardList;
    }
  }

  goToSite(id: number): void {
    this.route.navigate(['site', `${id}`])
  }
}
