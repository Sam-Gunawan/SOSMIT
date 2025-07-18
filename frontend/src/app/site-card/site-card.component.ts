import { Component, input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SiteCardInfo } from '../model/site-card-info.model';
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
  isMobile: boolean = false;

  siteCardList: SiteCardInfo[] = [];
  filteredSiteCardList: SiteCardInfo[] = []; 
  originalSiteCardList: SiteCardInfo[] = []; // Keep original data
  isLoading: boolean = true;
  errorMessage: string = '';
  filter = input<string>(''); // Input property to filter site cards
  selectedFilter: string = ''; // Track selected filter pill
  searchText: string = ''; // Track search input
  showToast: boolean = false;

  constructor(private apiService: ApiService, private route: Router) {}

  ngOnInit(): void {
    this.checkScreenSize();

    // console.log('[SiteCard] ngOnInit called');
    this.fetchMySiteCards();
    console.log('[SiteCard] Initial siteCardList:', this.siteCardList);
    console.log('[SiteCard] Initial filteredSiteCardList:', this.filteredSiteCardList);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768; // Define mobile breakpoint
    
    if (this.isMobile) {
      this.currentView = 'list'; // Force list view on mobile
    } else {
      this.currentView = 'card'; // Default to card view on desktop
    }
  }

  toggleView(view: 'card' | 'list') {
    if (!this.isMobile) { // Only allow toggle on desktop
      this.currentView = view;
    }
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
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
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

  filterByDropdown(status: string): void {
    this.selectedFilter = status;
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
