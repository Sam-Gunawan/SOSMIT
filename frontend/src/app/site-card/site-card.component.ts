import { Component, input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SiteCardInfo } from '../model/site-card-info.model';
import { ApiService } from '../services/api.service';
import { Router } from '@angular/router';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-site-card',
  imports: [CommonModule, FormsModule, MatPaginatorModule],
  templateUrl: './site-card.component.html',
  styleUrl: './site-card.component.scss'
})
export class SiteCardComponent {
  siteCardList: SiteCardInfo[] = [];
  filteredSiteCardList: SiteCardInfo[] = []; 
  paginatedSiteCardList: SiteCardInfo[] = []; // For displaying paginated results
  originalSiteCardList: SiteCardInfo[] = []; // Keep original data
  siteGroupList: string[] = [];
  regionList: string[] = [];
  allUsers: string[] = []; // List of all users for filtering
  isLoading: boolean = false;
  errorMessage: string = '';
  filter = input<string>(''); // Input property to filter site cards
  showToast: boolean = false;
  hasSearched: boolean = false; // Track if user has performed a search
  showSearchForm: boolean = false; // Track if search form is visible on mobile

  // Pagination properties
  pageSize: number = 5;
  pageIndex: number = 0;
  totalItems: number = 0;

  // Advanced search form fields
  searchCriteria = {
    siteName: '',
    siteGroup: '',
    siteRegion: '',
    opnameStatus: '',
    opnameFromDate: '',
    opnameToDate: '',
    opnameBy: ''
  };

  constructor(private apiService: ApiService, private route: Router) {}

  ngOnInit(): void {
    // Don't fetch data on init - only when user searches
    console.log('[SiteCard] ngOnInit called - waiting for user search');
  }

  fetchMySiteCards(): void {
    console.log('[SiteCard] fetchMySiteCards called');
    this.isLoading = true;
    this.apiService.getUserSiteCards().subscribe({
      next: (siteCardsList) => {
        this.originalSiteCardList = [...siteCardsList];
        this.siteCardList = siteCardsList;
        this.siteGroupList = Array.from(new Set(siteCardsList.map(site => site.siteGroup)));
        this.regionList = Array.from(new Set(siteCardsList.map(site => site.siteRegion)));
        this.isLoading = false;
        console.log('[SiteCard] Site cards fetched successfully:', this.siteCardList);
        this.performAdvancedSearch(); // Apply search criteria after fetching
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

  performAdvancedSearch(): void {
    // Always allow searching, even with no criteria (show all sites)
    this.hasSearched = true;

    // If we don't have the data yet, fetch it first
    if (this.originalSiteCardList.length === 0) {
      this.fetchMySiteCards();
      return;
    }

    let filteredList = [...this.originalSiteCardList];

    // Filter by site name
    if (this.searchCriteria.siteName && this.searchCriteria.siteName.trim() !== '') {
      const siteName = this.searchCriteria.siteName.toLowerCase().trim();
      filteredList = filteredList.filter(site => 
        site.siteName.toLowerCase().includes(siteName)
      );

      // Fill in the site group and region automatically based on site name
      if (filteredList.length > 0) {
        this.searchCriteria.siteGroup = filteredList[0].siteGroup;
        this.searchCriteria.siteRegion = filteredList[0].siteRegion;
      } else {
        this.searchCriteria.siteGroup = '';
        this.searchCriteria.siteRegion = '';
      }
    }

    // Filter by site group
    if (this.searchCriteria.siteGroup && this.searchCriteria.siteGroup.trim() !== '') {
      const siteGroup = this.searchCriteria.siteGroup.toLowerCase().trim();
      filteredList = filteredList.filter(site => 
        site.siteGroup.toLowerCase().includes(siteGroup)
      );

      // Fill in the site region automatically based on site group
      if (filteredList.length > 0) {
        this.searchCriteria.siteRegion = filteredList[0].siteRegion;
      } else {
        this.searchCriteria.siteRegion = '';
      }
    }

    // Filter by region
    if (this.searchCriteria.siteRegion && this.searchCriteria.siteRegion.trim() !== '') {
      const siteRegion = this.searchCriteria.siteRegion.toLowerCase().trim();
      filteredList = filteredList.filter(site => 
        site.siteRegion.toLowerCase().includes(siteRegion)
      );
    }

    // Filter by status
    if (this.searchCriteria.opnameStatus && this.searchCriteria.opnameStatus !== '') {
      filteredList = filteredList.filter(site => 
        site.opnameStatus === this.searchCriteria.opnameStatus
      );
    }

    // Filter by date range
    if (this.searchCriteria.opnameFromDate || this.searchCriteria.opnameToDate) {
      filteredList = filteredList.filter(site => {
        const opnameDate = new Date(site.opnameDate);
        let withinRange = true;

        if (this.searchCriteria.opnameFromDate) {
          const fromDate = new Date(this.searchCriteria.opnameFromDate);
          withinRange = withinRange && opnameDate >= fromDate;
        }

        if (this.searchCriteria.opnameToDate) {
          const toDate = new Date(this.searchCriteria.opnameToDate);
          withinRange = withinRange && opnameDate <= toDate;
        }

        return withinRange;
      });
    }

    // TODO: Filter by opname creator (opnameBy) - this would require API enhancement
    // Currently the SiteCardInfo model doesn't include this information

    this.filteredSiteCardList = filteredList;
    this.totalItems = filteredList.length;
    this.pageIndex = 0; // Reset to first page
    this.updatePaginatedList();
    
    // Hide search form on mobile after search
    if (window.innerWidth <= 768) {
      this.showSearchForm = false;
    }
  }

  updatePaginatedList(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedSiteCardList = this.filteredSiteCardList.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedList();
  }

  toggleSearchForm(): void {
    this.showSearchForm = !this.showSearchForm;
  }

  resetSearchForm(): void {
    this.searchCriteria = {
      siteName: '',
      siteGroup: '',
      siteRegion: '',
      opnameStatus: '',
      opnameFromDate: '',
      opnameToDate: '',
      opnameBy: ''
    };
    this.filteredSiteCardList = [];
    this.paginatedSiteCardList = [];
    this.hasSearched = false;
    this.pageIndex = 0;
    this.totalItems = 0;
  }

  goToSite(id: number): void {
    this.route.navigate(['site', `${id}`])
  }
}
