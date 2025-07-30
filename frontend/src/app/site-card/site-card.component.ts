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

@Component({
  selector: 'app-site-card',
  imports: [CommonModule, FormsModule, MatPaginatorModule, MatDatepickerModule, MatInputModule, MatFormFieldModule, MatNativeDateModule],
  templateUrl: './site-card.component.html',
  styleUrl: './site-card.component.scss'
})
export class SiteCardComponent {
  siteCardList: SiteInfo[] = [];
  filteredSiteCardList: SiteInfo[] = []; 
  paginatedSiteCardList: SiteInfo[] = []; // For displaying paginated results
  originalSiteCardList: SiteInfo[] = []; // Keep original data
  siteGroupList: string[] = [];
  allUsers: User[] = []; // List of all users for filtering
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
    opnameStatus: '',
    opnameFromDate: null as Date | null, // From date picker
    opnameToDate: null as Date | null,   // To date picker
    opnameBy: '', // User ID for last opname by
    opnameByName: '' // User name for last opname by
  };

  constructor(private apiService: ApiService, private route: Router, private opnameSessionService: OpnameSessionService) {}

  ngOnInit(): void {
    // Fetch users for the dropdown first
    this.fetchUsers();
    console.log('[SiteCard] ngOnInit called - users will be fetched, site data loaded on search');
  }

  fetchUsers(): void {
    console.log('[SiteCard] fetchUsers called');
    this.apiService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
        console.log('[SiteCard] Users fetched successfully:', this.allUsers);
        
        // If we already have site cards loaded, populate the opname user info
        if (this.originalSiteCardList.length > 0) {
          this.populateOpnameUserInfo();
        }
      },
      error: (error) => {
        console.error('[SiteCard] Error fetching users:', error);
      }
    });
  }

  fetchMySiteCards(): void {
    console.log('[SiteCard] fetchMySiteCards called');
    this.isLoading = true;
    this.apiService.getUserSiteCards().subscribe({
      next: (siteCardsList) => {
        this.originalSiteCardList = [...siteCardsList];
        this.siteCardList = siteCardsList;
        this.siteGroupList = Array.from(new Set(siteCardsList.map(site => site.siteGroup)));
        this.isLoading = false;
        
        this.populateOpnameUserInfo();
        this.performAdvancedSearch(); // Apply search criteria after fetching
        
        console.log('[SiteCard] Site cards fetched successfully:', this.siteCardList);        
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

  private populateOpnameUserInfo(): void {
    // For each site that has a valid session ID, fetch the user details
    this.originalSiteCardList.forEach(site => {
      if (site.opnameSessionID && site.opnameSessionID > 0) {
        this.opnameSessionService.getUserFromOpnameSession(site.opnameSessionID).subscribe({
          next: (user) => {
            site.opnameUserID = user ? user.userID : -1;
            site.opnameUserName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
            
            // Fallback: If we have userID but no userName, try to populate it from allUsers
            const fallbackUser = this.allUsers.find(u => u.userID === site.opnameUserID);
            if (fallbackUser) {
              site.opnameUserName = `${fallbackUser.firstName} ${fallbackUser.lastName}`;
            }
          }
        });

      }
    });
    console.log('[SiteCard] Populated opname user info for site cards');
  }

  getUserDisplayName(userID: number): string {
    if (!userID || userID === 0) {
      return 'Unknown User';
    }
    
    const user = this.allUsers.find(u => u.userID === userID);
    if (user) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    return `User ID: ${userID}`;
  }

  // Helper method to set user by ID and populate the name
  setUserById(userID: number): void {
    const user = this.allUsers.find(u => u.userID === userID);
    if (user) {
      this.searchCriteria.opnameBy = userID.toString();
      this.searchCriteria.opnameByName = `${user.firstName} ${user.lastName}`;
    } else {
      this.searchCriteria.opnameBy = '';
      this.searchCriteria.opnameByName = '';
    }
  }

  // Method to resolve user name to ID when search is performed
  private resolveUserNameToId(): void {
    if (!this.searchCriteria.opnameByName || this.searchCriteria.opnameByName.trim() === '') {
      this.searchCriteria.opnameBy = '';
      return;
    }

    const inputValue = this.searchCriteria.opnameByName.trim();
    
    // Try to find user by name (exact match first, then partial match)
    let user = this.allUsers.find(u => {
      const fullName = `${u.firstName} ${u.lastName}`;
      return fullName.toLowerCase() === inputValue.toLowerCase();
    });

    // If no exact match, try partial match
    if (!user) {
      user = this.allUsers.find(u => {
        const fullName = `${u.firstName} ${u.lastName}`;
        return fullName.toLowerCase().includes(inputValue.toLowerCase());
      });
    }

    if (user) {
      // Set the ID for search and update the display name to the exact match
      this.searchCriteria.opnameBy = user.userID.toString();
      this.searchCriteria.opnameByName = `${user.firstName} ${user.lastName}`;
      console.log(`[SiteCard] Resolved user name "${inputValue}" to ID: ${user.userID} (${user.firstName} ${user.lastName})`);
    } else {
      // Keep the typed text but clear the ID (will use fallback search)
      this.searchCriteria.opnameBy = '';
      console.log(`[SiteCard] No user found for name: "${inputValue}", will use fallback search`);
    }
  }

  performAdvancedSearch(): void {
    // Always allow searching, even with no criteria (show all sites)
    this.hasSearched = true;

    // If we don't have the data yet, fetch it first
    if (this.originalSiteCardList.length === 0) {
      this.fetchMySiteCards();
      return;
    }

    // Resolve user name to ID before performing search
    this.resolveUserNameToId();

    console.log('[SiteCard] Starting advanced search with criteria:', this.searchCriteria);
    console.log('[SiteCard] Original site cards count:', this.originalSiteCardList.length);

    let filteredList = [...this.originalSiteCardList];

    // Filter by site name
    if (this.searchCriteria.siteName && this.searchCriteria.siteName.trim() !== '') {
      const siteName = this.searchCriteria.siteName.toLowerCase().trim();
      filteredList = filteredList.filter(site => 
        site.siteName.toLowerCase().includes(siteName)
      );

      // Fill in the site group automatically based on site name (if applicable)
      // Only do this if the resulting filtered list's site group is unique
      if (filteredList.length > 0) {  
        const uniqueSiteGroups = Array.from(new Set(filteredList.map(site => site.siteGroup)));

        this.searchCriteria.siteGroup = uniqueSiteGroups.length === 1 ? uniqueSiteGroups[0] : '';
      } else {
        this.searchCriteria.siteGroup = '';
      }
    }

    // Filter by site group
    if (this.searchCriteria.siteGroup && this.searchCriteria.siteGroup.trim() !== '') {
      const siteGroup = this.searchCriteria.siteGroup.toLowerCase().trim();
      filteredList = filteredList.filter(site => 
        site.siteGroup.toLowerCase().includes(siteGroup)
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
          fromDate.setHours(0, 0, 0, 0); // Start of day
          withinRange = withinRange && opnameDate >= fromDate;
        }

        if (this.searchCriteria.opnameToDate) {
          const toDate = new Date(this.searchCriteria.opnameToDate);
          toDate.setHours(23, 59, 59, 999); // End of day
          withinRange = withinRange && opnameDate <= toDate;
        }

        return withinRange;
      });
    }

    // Filter by last opname user (using the resolved user ID)
    if (this.searchCriteria.opnameBy && this.searchCriteria.opnameBy.trim() !== '') {
      const selectedUserID = parseInt(this.searchCriteria.opnameBy.trim());
      
      if (!isNaN(selectedUserID)) {
        filteredList = filteredList.filter(site => 
          site.opnameUserID === selectedUserID
        );
        console.log(`[SiteCard] Filtering by user ID: ${selectedUserID} (${this.searchCriteria.opnameByName}), found ${filteredList.length} sites`);
      } else {
        console.log(`[SiteCard] Invalid user ID for filtering: "${this.searchCriteria.opnameBy}"`);
      }
    } else if (this.searchCriteria.opnameByName && this.searchCriteria.opnameByName.trim() !== '') {
      // Fallback: if user typed something but no ID was resolved, try partial name matching
      const searchTerm = this.searchCriteria.opnameByName.toLowerCase().trim();
      filteredList = filteredList.filter(site => {
        if (site.opnameUserName) {
          return site.opnameUserName.toLowerCase().includes(searchTerm);
        }
        // If opnameUserName is not available, try to find it from allUsers
        if (site.opnameUserID && site.opnameUserID > 0) {
          const user = this.allUsers.find(u => u.userID === site.opnameUserID);
          if (user) {
            const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
            return fullName.includes(searchTerm);
          }
        }
        return false;
      });
      console.log(`[SiteCard] Fallback filtering by user name: "${searchTerm}", found ${filteredList.length} sites`);
    }

    this.filteredSiteCardList = filteredList;
    this.totalItems = filteredList.length;
    this.pageIndex = 0; // Reset to first page
    this.updatePaginatedList();
    
    console.log(`[SiteCard] Search complete. Final results: ${filteredList.length} sites`);
    
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
      opnameStatus: '',
      opnameFromDate: null,
      opnameToDate: null,
      opnameBy: '',
      opnameByName: ''
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
