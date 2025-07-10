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
  currentView: 'card' | 'list' = 'card';

  siteCardList: Siteinfo[] = [];
  filteredSiteCardList: Siteinfo[] = []; 
  originalSiteCardList: Siteinfo[] = []; // Keep original data
  isLoading: boolean = true;
  errorMessage: string = '';
  filter = input<string>(''); // Input property to filter site cards
  selectedFilter: string = ''; // Track selected filter pill
  searchText: string = ''; // Track search input

  constructor(private apiService: ApiService, private route: Router) {}

  toggleView(view: 'card' | 'list') {
    this.currentView = view;
  }
  
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
        this.originalSiteCardList = [...siteCardsList]; // Store original data
        this.siteCardList = siteCardsList; // Update the siteCardList with the fetched data
        this.filteredSiteCardList = siteCardsList; // Initialize filtered list
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

  filterSiteCards(filterValue: string): void {
    console.log('[SiteCard] filterSiteCards called with value:', filterValue);
    this.searchText = filterValue;
    this.applyFilters();
  }

  filterByStatus(status: string): void {
    console.log('[SiteCard] filterByStatus called with status:', status);
    // Toggle selection: if same status is clicked, deselect it
    this.selectedFilter = this.selectedFilter === status ? '' : status;
    this.applyFilters();
  }

  applyFilters(): void {
    let filteredList = [...this.originalSiteCardList];

    // Apply status filter
    if (this.selectedFilter) {
      filteredList = filteredList.filter(site => 
        site.opnameStatus === this.selectedFilter
      );
    }

    // Apply search text filter
    if (this.searchText) {
      const searchWords = this.searchText.toLowerCase().split(' ').filter(word => word.length > 0);
      filteredList = filteredList.filter(site => {
        const searchableText = `${site.siteName} ${site.siteGroup} ${site.siteRegion}`.toLowerCase();
        return searchWords.every(word => searchableText.includes(word));
      });
    }

    this.filteredSiteCardList = filteredList;
  }

  clearAllFilters(): void {
    this.selectedFilter = '';
    this.searchText = '';
    this.filteredSiteCardList = [...this.originalSiteCardList];
  }

  goToSite(id: number): void {
    this.route.navigate(['site', `${id}`])
  }
}
