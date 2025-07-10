import { Component, input } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { ApiService } from '../services/api.service';
  import { OpnameSessionService } from '../services/opname-session.service';
  import { ActivatedRoute, Router } from '@angular/router';
  import { Siteinfo } from '../model/siteinfo.model';
  import { AssetCardComponent } from '../asset-card/asset-card.component';
import { OpnameSession } from '../model/opname-session.model';

  @Component({
    selector: 'app- site-page',
    imports: [CommonModule, AssetCardComponent],
    templateUrl: './site-page.component.html',
    styleUrl: './site-page.component.scss'
  })
  export class SitePageComponent {
    sitePage: Siteinfo;
    siteList?: Siteinfo[] = []; // Initialize siteList as an empty array
    isLoading: boolean = true; // Loading state to show a spinner or loading indicator
    errorMessage: string = '';
    opnameLoading: boolean = false; // Loading state for starting a new opname session
    actionButtonError: string = ''; // Error message for floating action button (at bottom right corner)
    opnameSession?: OpnameSession; // Optional opname session to hold the current session data

    constructor(private route: ActivatedRoute, private apiService: ApiService, private router: Router, private opnameSessionService: OpnameSessionService) {
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
      if (this.opnameLoading) {
        console.log('[SitePage] Request already in progress, ignoring duplicate click');
        return;
      }

      // This method will start a new stock opname session for the current site.
      this.opnameLoading = true; // Set loading state to true before starting the request
      this.actionButtonError = ''; // Clear any previous errors
      
      console.log('[SitePage] Starting new opname for site ID:', this.sitePage.siteID);
      
      this.opnameSessionService.startNewOpname(this.sitePage.siteID).subscribe({
        next: (response) => {
          this.opnameLoading = false; // Set loading state to false after starting opname
          console.log('[SitePage] New opname session started successfully:', response);
          
          // Update the sitePage with the new opname session ID.
          this.sitePage.opnameSessionID = response.opnameSessionID;

          // Store the session ID in the service
          this.opnameSessionService.setSessionId(response.opnameSessionID);

          // Redirect to the opname page using router state
          this.router.navigate(['/site', this.sitePage.siteID, 'opname'], {
            state: { sessionID: response.opnameSessionID }
          });
        },

        error: (error) => {
          this.opnameLoading = false; // Set loading state to false even if there's an error
          console.error('[SitePage] Error starting new opname session:', error);
          this.actionButtonError = 'Failed to start a new opname session. Please try again later.';
        }
      });
    }

    continueOpname(): void {
      // This method will continue an existing stock opname session for the current site.
      // TODO: check if opname's status is active or not, only continue if active.
      this.opnameLoading = true;
      this.opnameSessionService.getOpnameSession(this.sitePage.opnameSessionID).subscribe({
        next: (opnameSession) => {
          this.opnameSession = opnameSession; // Store the current opname session data
          this.opnameLoading = false; // Set loading state to false after fetching session
          console.log('[SitePage] Current opname session:', this.opnameSession);
        },
        error: (error) => {
          console.error('[SitePage] Error fetching current opname session:', error);
          this.opnameLoading = false; // Set loading state to false on error
          this.actionButtonError = 'Failed to fetch current opname session. Please try again later.';
          return;
        }
      })

      if (this.sitePage.opnameSessionID > 0 && this.opnameSession?.status === 'Active') {
        this.opnameSessionService.continueOpname(this.sitePage.opnameSessionID, this.sitePage.siteID, this.router);
      } else {
        console.error('[SitePage] No existing active opname session to continue');
        this.actionButtonError = 'No existing Active opname session found.';
      }
    }
  }
