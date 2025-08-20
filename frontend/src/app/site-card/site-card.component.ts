import { Component, input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SiteInfo } from '../model/site-info.model';
import { User } from '../model/user.model';
import { ApiService } from '../services/api.service';
import { Router } from '@angular/router';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { OpnameSessionService } from '../services/opname-session.service';
import { MatOptionModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

@Component({
  selector: 'app-site-card',
  imports: [CommonModule, FormsModule, MatPaginatorModule, MatDatepickerModule, MatInputModule, MatFormFieldModule, MatNativeDateModule, MatOptionModule, MatAutocompleteModule],
  templateUrl: './site-card.component.html',
  styleUrl: './site-card.component.scss'
})
export class SiteCardComponent {
  opnameLocations: any[] = []; // Single source of truth from backend
  allUsers: User[] = []; // List of all users for filtering
  isLoading: boolean = false;
  errorMessage: string = '';
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
    siteGroupName: '',
    opnameStatus: '',
    fromDate: null as Date | null, // From date picker
    endDate: null as Date | null,   // To date picker
    createdBy: '', // User name for last opname by
    deptName: '',
    subSiteName: '',
    searchIn: 'area' as 'ho' | 'area', // Toggle between HO and Area mode
    limit: 5 as number,
    pageNum: 1 as number
  };

  constructor(private apiService: ApiService, private route: Router, private opnameSessionService: OpnameSessionService) {}

  ngOnInit(): void {
    console.log('[SiteCard] ngOnInit called - ready to search opname locations');
    // No automatic search - user must click search to get results
  }

  // Toggle between HO and Area search modes
  toggleSearchMode(mode: 'ho' | 'area'): void {
    if (this.searchCriteria.searchIn !== mode) {
      this.searchCriteria.searchIn = mode;
      // Reset page to first when changing modes
      this.pageIndex = 0;
      this.searchCriteria.pageNum = 1;
      this.opnameLocations = [];
      this.hasSearched = false; // Reset search state
    }
  }

  // Main search method that calls the backend with pagination and filtering
  performSearch(): void {
    this.isLoading = true;
    this.hasSearched = true;

    // Build filter object for backend API
    const filter = {
      site_group_name: this.searchCriteria.siteGroupName || null,
      site_name: this.searchCriteria.siteName || null,
      sub_site_name: this.searchCriteria.subSiteName || null,
      dept_name: this.searchCriteria.deptName || null,
      created_by: this.searchCriteria.createdBy || null,
      opname_status: this.searchCriteria.opnameStatus || null,
      from_date: this.searchCriteria.fromDate || null,
      end_date: this.searchCriteria.endDate || null,
      search_in: this.searchCriteria.searchIn,
      limit: this.pageSize,
      page_num: this.pageIndex + 1 // Convert 0-based to 1-based for backend
    };

    console.log('[SiteCard] Performing search with criteria:', filter);

    this.apiService.getUserOpnameLocations(filter).subscribe({
      next: (result) => {
        console.log('[SiteCard] Search results:', result);
        this.opnameLocations = result.locations || [];
        this.totalItems = result.totalCount || 0;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('[SiteCard] Error fetching opname locations:', error);
        this.errorMessage = 'Failed to fetch locations. Please try again.';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
        this.isLoading = false;
      }
    });
  }

  // Handle pagination changes
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.searchCriteria.pageNum = this.pageIndex + 1; // Convert to 1-based
    this.performSearch(); // Fetch new page from backend
  }

  // Trigger search when form is submitted
  onSearchSubmit(): void {
    // Reset to first page when performing new search
    this.pageIndex = 0;
    this.searchCriteria.pageNum = 1;
    this.performSearch();
    
    // Hide search form on mobile after search
    if (window.innerWidth <= 768) {
      this.showSearchForm = false;
    }
  }

  toggleSearchForm(): void {
    this.showSearchForm = !this.showSearchForm;
  }

  resetSearchForm(): void {
    this.searchCriteria = {
      siteName: '',
      siteGroupName: '',
      opnameStatus: '',
      fromDate: null,
      endDate: null,
      createdBy: '',
      subSiteName: '',
      deptName: '',
      searchIn: this.searchCriteria.searchIn, // Keep current search mode
      limit: 5,
      pageNum: 1
    };
    this.opnameLocations = [];
    this.hasSearched = false;
    this.pageIndex = 0;
    this.totalItems = 0;
  }

  // Handle click on location (either site or department)
  onLocationClick(location: any): void {
    if (this.searchCriteria.searchIn === 'ho') {
      // For HO mode (departments), use site ID 25
      this.goToSite(25);
    } else {
      // For area mode (sites), use the actual site ID
      this.goToSite(location.siteId);
    }
  }

  goToSite(id: number): void {
    this.route.navigate(['site', `${id}`])
  }
}
