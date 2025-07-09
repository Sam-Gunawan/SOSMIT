  import { Component, input } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { ApiService } from '../services/api.service';
  import { ActivatedRoute, Router } from '@angular/router';
  import { DashboardComponent } from '../dashboard/dashboard.component';
  import { Siteinfo } from '../model/siteinfo.model';
  import { Assetinfo } from '../model/assetinfo.model';
  import { AssetCardComponent } from '../asset-card/asset-card.component';

  @Component({
    selector: 'app-site-page',
    imports: [CommonModule, AssetCardComponent],
    templateUrl: './site-page.component.html',
    styleUrl: './site-page.component.scss'
  })
  export class SitePageComponent {
    sitePage: Siteinfo;
    siteList?: Siteinfo[] = []; // Initialize siteList as an empty array
    isLoading: boolean = true; // Loading state to show a spinner or loading indicator
    errorMessage: string = '';
    newOpnameLoading: boolean = false; // Loading state for starting a new opname session
    actionButtonError: string = ''; // Error message for floating action button (at bottom right corner)
    latestOpnameID: number = -1;

    constructor(private route: ActivatedRoute, private apiService: ApiService, private router: Router) {
      this.sitePage = {
        siteID: -1,
        siteName: '',
        siteGroup: '',
        siteRegion: '',
        siteGA: -1,
        opnameSessionID: -1,
        opnameStatus: '',
        opnameDate: ''
      };
    }

    ngOnInit(): void {
      this.fetchSitePage(); // Fetch site page data when the component initializes
    } 

    fetchSitePage(): void {
      this.isLoading = true; // Set loading state to true before fetching data
      this.apiService.getUserSiteCards().subscribe({
        next: (siteCardsList) => {
          this.siteList = siteCardsList; // Update the siteList with the fetched data
          console.log('[SitePage] Site cards fetched successfully:', this.siteList);
          const id = Number(this.route.snapshot.paramMap.get('id'));
          const fetchedSite = this.siteList?.find((site: Siteinfo) => site.siteID === id);
          this.isLoading = false; // Set loading state to false after data is fetched
          if (fetchedSite) {
            this.sitePage = fetchedSite; // Set the sitePage to the fetched site
          } else {
            this.errorMessage = 'Site not found.';
            console.error('[SitePage] Site not found for ID:', id);
            return
          }
          console.log('sitePage', this.sitePage);
        },
        error: (error) => {
          // Handle the error appropriately, e.g., show a message to the user
          console.error('[SitePage] Failed to fetch site cards:', error);
          this.isLoading = false; // Set loading state to false even if there's an error
          this.errorMessage = 'Failed to load site cards. Please try again later.';
        }
      });
    }

    startNewOpname(): void {
      // Prevent multiple simultaneous requests
      if (this.newOpnameLoading) {
        console.log('[SitePage] Request already in progress, ignoring duplicate click');
        return;
      }

      // This method will start a new stock opname session for the current site.
      this.newOpnameLoading = true; // Set loading state to true before starting the request
      this.actionButtonError = ''; // Clear any previous errors
      
      console.log('[SitePage] Starting new opname for site ID:', this.sitePage.siteID);
      
      this.apiService.startNewOpname(this.sitePage.siteID).subscribe({
        next: (response) => {
          this.newOpnameLoading = false; // Set loading state to false after starting opname
          console.log('[SitePage] New opname session started successfully:', response);
          
          // Update the latestOpnameID to the response ID
          this.latestOpnameID = response.opnameSessionID;
          
          // Redirect to the opname page with the new session ID
          this.router.navigate(['/site', this.sitePage.siteID, 'opname', response.opnameSessionID]);
        },

        error: (error) => {
          this.newOpnameLoading = false; // Set loading state to false even if there's an error
          console.error('[SitePage] Error starting new opname session:', error);
          this.actionButtonError = 'Failed to start a new opname session. Please try again later.';
        }
      });
    }
  }
