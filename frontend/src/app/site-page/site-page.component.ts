import { Component, input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { OpnameSessionService } from '../services/opname-session.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SiteInfo } from '../model/site-info.model';
import { AssetCardComponent } from '../asset-card/asset-card.component';
import { OpnameSession } from '../model/opname-session.model';

  @Component({
    selector: 'app- site-page',
    imports: [CommonModule, AssetCardComponent],
    templateUrl: './site-page.component.html',
    styleUrl: './site-page.component.scss'
  })
  export class SitePageComponent {
    sitePage: SiteInfo;
    siteList?: SiteInfo[] = []; // Initialize siteList as an empty array
    isLoading: boolean = true; // Loading state to show a spinner or loading indicator
    errorMessage: string = '';
    opnameLoading: boolean = false; // Loading state for starting a new opname session
    opnameSession?: OpnameSession; // Optional opname session to hold the current session data
    showToast: boolean = false;
    floatingMenuExpanded: boolean = false; // Track floating menu expanded state

    constructor(private route: ActivatedRoute, private apiService: ApiService, private router: Router, private opnameSessionService: OpnameSessionService) {
      this.sitePage = {
        siteID: -1,
        siteName: '',
        siteGroup: '',
        siteRegion: '',
        siteGaID: -1,
        siteGaName: '',
        siteGaEmail: '',
        opnameSessionID: -1,
        opnameUserID: -1,
        opnameUserName: '',
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
          const fetchedSite = this.siteList?.find((site: SiteInfo) => site.siteID === id);
          this.isLoading = false; // Set loading state to false after data is fetched
          if (fetchedSite) {
            this.sitePage = fetchedSite; // Set the sitePage to the fetched site
          } else {
            this.errorMessage = 'Site tidak ditemukan.';
            this.showToast = true;
            setTimeout(() => this.showToast = false, 3000);
            console.error('[SitePage] Site not found for ID:', id);
            return
          }
          console.log('sitePage', this.sitePage);
        },
        error: (error) => {
          // Handle the error appropriately, e.g., show a message to the user
          console.error('[SitePage] Failed to fetch site cards:', error);
          this.isLoading = false; // Set loading state to false even if there's an error
          this.errorMessage = 'Gagal memuat kartu site. Silakan coba lagi nanti.';
          this.showToast = true;
          setTimeout(() => this.showToast = false, 3000);
        }
      });
    }

    toggleFloatingMenu(): void {
      this.floatingMenuExpanded = !this.floatingMenuExpanded;
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
      const target = event.target as HTMLElement;
      const floatingContainer = document.getElementById('container-floating');
      
      // Check if the clicked element is outside the floating menu container
      if (this.floatingMenuExpanded && floatingContainer && !floatingContainer.contains(target)) {
        this.floatingMenuExpanded = false;
      }
    }

    startNewOpname(): void {
      // Prevent multiple simultaneous requests
      if (this.opnameLoading) {
        console.log('[SitePage] Request already in progress, ignoring duplicate click');
        return;
      }

      // This method will start a new stock opname session for the current site.
      this.opnameLoading = true; // Set loading state to true before starting the request
      this.errorMessage = ''; // Clear any previous errors
      
      console.log('[SitePage] Starting new opname for site ID:', this.sitePage.siteID);
      
      this.opnameSessionService.startNewOpname(this.sitePage.siteID).subscribe({
        next: (response) => {
          this.opnameLoading = false; // Set loading state to false after starting opname
          console.log('[SitePage] New opname session started successfully:', response);
          
          // Update the sitePage with the new opname session ID.
          this.sitePage.opnameSessionID = response.opnameSessionID;

          // Store the session ID and site ID in the service
          this.opnameSessionService.setSessionId(response.opnameSessionID);
          this.opnameSessionService.setSiteId(this.sitePage.siteID);

          // Redirect to the opname page using router state
          this.router.navigate(['/site', this.sitePage.siteID, 'opname'], {
            state: { sessionID: response.opnameSessionID }
          });
        },

        error: (error) => {
          this.opnameLoading = false; // Set loading state to false even if there's an error
          console.error('[SitePage] Error starting new opname session:', error.error.error);
          this.errorMessage = error.error.error || 'Gagal memulai sesi opname baru. Silakan coba lagi nanti.';
          this.showToast = true;
          setTimeout(() => this.showToast = false, 3000);
        }
      });
    }

    continueOpname(): void {
      // This method will continue an existing stock opname session for the current site.
      // Prevent multiple simultaneous requests
      if (this.opnameLoading) {
        console.log('[SitePage] Request already in progress, ignoring duplicate click');
        return;
      }
      
      this.opnameLoading = true;
      this.errorMessage = ''; // Clear any previous errors
      
      if (this.sitePage.opnameSessionID <= 0) {
        this.opnameLoading = false;
        this.errorMessage = 'Tidak ada sesi opname yang tersedia.';
        console.error('[SitePage] No opname session ID to continue');
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
        return;
      }
      
      this.opnameSessionService.getOpnameSession(this.sitePage.opnameSessionID).subscribe({
        next: (opnameSession) => {
          this.opnameSession = opnameSession; // Store the current opname session data
          this.opnameLoading = false; // Set loading state to false after fetching session
          console.log('[SitePage] Current opname session:', this.opnameSession);
          
          // Only continue if the session is active - MOVED THIS INSIDE THE SUCCESS CALLBACK
          if (this.opnameSession && this.opnameSession.status === 'Active') {
            this.opnameSessionService.continueOpname(this.sitePage.opnameSessionID, this.sitePage.siteID, this.router);
          } else {
            const status = this.opnameSession ? this.opnameSession.status : 'unknown';
            console.error('[SitePage] Opname session is not active:', status);
            this.errorMessage = `Sesi opname tidak aktif (status saat ini: ${status}).`;
            this.showToast = true;
            setTimeout(() => this.showToast = false, 3000);
          }
        },
        error: (error) => {
          console.error('[SitePage] Error fetching current opname session:', error);
          this.opnameLoading = false; // Set loading state to false on error
          this.errorMessage = 'Gagal memuat sesi opname saat ini. Silakan coba lagi nanti.';
          this.showToast = true;
          setTimeout(() => this.showToast = false, 3000);
        }
      });
    }

    goToReport(): void {
      // Navigate to the report page for the current site
      const siteID = this.sitePage.siteID;
      if (siteID > 0) {
        this.router.navigate(['/site', siteID, 'report']);
      } else {
        console.error('[SitePage] Invalid site ID for report navigation:', siteID);
        this.errorMessage = 'ID site tidak valid untuk navigasi laporan.';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
      }
    }
  }
