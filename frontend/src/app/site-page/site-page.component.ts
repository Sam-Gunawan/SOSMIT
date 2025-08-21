import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OpnameSessionService } from '../services/opname-session.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SiteInfo } from '../model/site-info.model';
import { AssetCardComponent } from '../asset-card/asset-card.component';
import { OpnameSession } from '../model/opname-session.model';
import { Department } from '../model/dept.model';
import { ApiService } from '../services/api.service';
import { firstValueFrom } from 'rxjs';

  @Component({
    selector: 'app- site-page',
    imports: [CommonModule, AssetCardComponent],
    templateUrl: './site-page.component.html',
    styleUrl: './site-page.component.scss'
  })
  export class SitePageComponent implements OnInit{
    location = {} as any;
    siteList?: SiteInfo[] = []; // Initialize siteList as an empty array
    isLoading: boolean = false; // Loading state to show a spinner or loading indicator
    errorMessage: string = '';
    opnameLoading: boolean = false; // Loading state for starting a new opname session
    opnameSession?: OpnameSession; // Optional opname session to hold the current session data
    showToast: boolean = false;
    floatingMenuExpanded: boolean = false; // Track floating menu expanded state

    constructor(
      private route: ActivatedRoute,
      private router: Router,
      private opnameSessionService: OpnameSessionService,
      private apiService: ApiService,
    ) {}

    ngOnInit(): void {
      this.getLocationInfo();
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

    async getLocationInfo(): Promise<void> {
      this.isLoading = true;
      
      try {
        const params = await firstValueFrom(this.route.queryParamMap);
        
        // Check whether any params are provided or whether both site_id and dept_id are provided. If invalid, then throw an error
        // In other words, the params must be exactly one (either site id or dept id provided)
        if (!params || params.keys.length !== 1) {
          this.errorMessage = 'Halaman lokasi invalid.';
          this.showToast = true;
          setTimeout(() => this.showToast = false, 3000);
          this.isLoading = false;
          return;
        }

        if (params.keys.indexOf('site_id') !== -1) {
          const siteID = Number(params.get('site_id'));
          
          // Fetch site information
          const site = await firstValueFrom(this.apiService.getSiteByID(siteID));
          if (site) {
            this.location = site;
            
            // Fetch opname status information
            const opnameStatus = await firstValueFrom(this.apiService.getLatestOpnameStatus(siteID));
            if (opnameStatus) {
              this.location.opnameStatus = opnameStatus.status;
              this.location.opnameDate = opnameStatus.date;
            }
          }
          
        } else if (params.keys.indexOf('dept_id') !== -1) {
          const deptID = Number(params.get('dept_id'));
          
          // Fetch department information
          const dept = await firstValueFrom(this.apiService.getDeptByID(deptID));
          if (dept) {
            this.location = dept;
            console.log('[SitePage] Department info loaded:', this.location);
            
            // Fetch opname status information
            const opnameStatus = await firstValueFrom(this.apiService.getLatestOpnameStatus(undefined, deptID));
            if (opnameStatus) {
              this.location.opnameStatus = opnameStatus.status;
              this.location.opnameDate = opnameStatus.date;
            }
          }
        }
        
        this.isLoading = false;
        
      } catch (error: any) {
        this.isLoading = false;
        console.error('[SitePage] Error loading location info:', error?.error?.error || error);
        this.errorMessage = error?.error?.error || 'Gagal memuat halaman lokasi. Silakan coba lagi';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
      }
    }

    startNewOpname(): void {
      // Prevent multiple simultaneous requests
      if (this.opnameLoading) {
        return;
      }

      // This method will start a new stock opname session for the current site.
      this.opnameLoading = true; // Set loading state to true before starting the request
      this.errorMessage = ''; // Clear any previous errors


      this.opnameSessionService.startNewOpname(this.location.siteID, this.location.deptID).subscribe({
        next: (response) => {
          this.opnameLoading = false; // Set loading state to false after starting opname

          // Update the location with the new opname session ID.
          this.location.opnameSessionID = response.opnameSessionID;

          // Store the session ID and location ID in the service
          this.opnameSessionService.setSessionId(response.opnameSessionID);
          
          // Navigate to opname page with appropriate query parameters
          if (this.location.siteID) {
            this.opnameSessionService.setLocationId(this.location.siteID, 'site');
            this.router.navigate(['/location/opname'], {
              queryParams: { site_id: this.location.siteID },
              state: { sessionID: response.opnameSessionID }
            });
          } else if (this.location.deptID) {
            this.opnameSessionService.setLocationId(this.location.deptID, 'dept');
            this.router.navigate(['/location/opname'], {
              queryParams: { dept_id: this.location.deptID },
              state: { sessionID: response.opnameSessionID }
            });
          }
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
        return;
      }
      
      this.opnameLoading = true;
      this.errorMessage = ''; // Clear any previous errors

      if (this.location.opnameSessionID <= 0) {
        this.opnameLoading = false;
        this.errorMessage = 'Tidak ada sesi opname yang tersedia.';
        console.error('[SitePage] No opname session ID to continue');
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
        return;
      }

      console.log('[SitePage] Current opname session:', this.opnameSession);
      console.log('[SitePage] location: ', this.location);

      this.opnameSessionService.getOpnameSession(this.location.opnameSessionID).subscribe({
        next: (opnameSession) => {
          this.opnameSession = opnameSession; // Store the current opname session data
          this.opnameLoading = false; // Set loading state to false after fetching session


          // Only continue if the session is active - MOVED THIS INSIDE THE SUCCESS CALLBACK
          if (this.opnameSession && this.opnameSession.status === 'Active') {
            // Determine location type and ID based on what's available
            if (this.location.siteID) {
              this.opnameSessionService.continueOpname(this.location.opnameSessionID, this.location.siteID, 'site', this.router);
            } else if (this.location.deptID) {
              this.opnameSessionService.continueOpname(this.location.opnameSessionID, this.location.deptID, 'dept', this.router);
            }
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
      const siteID = this.location.siteID;
      if (siteID > 0) {
        this.router.navigate(['/location/report'], { queryParams: { site_id: siteID } });
      } else {
        console.error('[SitePage] Invalid site ID for report navigation:', siteID);
        this.errorMessage = 'ID site tidak valid untuk navigasi laporan.';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
      }
    }
  }
