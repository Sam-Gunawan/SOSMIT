import { Component, input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { OpnameSessionService } from '../services/opname-session.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SiteInfo } from '../model/site-info.model';
import { AssetCardComponent } from '../asset-card/asset-card.component';
import { OpnameSession } from '../model/opname-session.model';
import { Department } from '../model/dept.model';

  @Component({
    selector: 'app- site-page',
    imports: [CommonModule, AssetCardComponent],
    templateUrl: './site-page.component.html',
    styleUrl: './site-page.component.scss'
  })
  export class SitePageComponent {
    site: SiteInfo = {} as SiteInfo;
    dept: Department = {} as Department;
    siteList?: SiteInfo[] = []; // Initialize siteList as an empty array
    isLoading: boolean = false; // Loading state to show a spinner or loading indicator
    errorMessage: string = '';
    opnameLoading: boolean = false; // Loading state for starting a new opname session
    opnameSession?: OpnameSession; // Optional opname session to hold the current session data
    showToast: boolean = false;
    floatingMenuExpanded: boolean = false; // Track floating menu expanded state

    constructor(private router: Router, private opnameSessionService: OpnameSessionService) {}

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
        return;
      }

      // This method will start a new stock opname session for the current site.
      this.opnameLoading = true; // Set loading state to true before starting the request
      this.errorMessage = ''; // Clear any previous errors
      
      
      this.opnameSessionService.startNewOpname(this.site.siteID, this.dept.deptID).subscribe({
        next: (response) => {
          this.opnameLoading = false; // Set loading state to false after starting opname
          
          // Update the site with the new opname session ID.
          this.site.opnameSessionID = response.opnameSessionID;

          // Store the session ID and site ID in the service
          this.opnameSessionService.setSessionId(response.opnameSessionID);
          this.opnameSessionService.setSiteId(this.site.siteID);

          // Redirect to the opname page using router state
          this.router.navigate(['/site', this.site.siteID, 'opname'], {
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
        return;
      }
      
      this.opnameLoading = true;
      this.errorMessage = ''; // Clear any previous errors
      
      if (this.site.opnameSessionID <= 0) {
        this.opnameLoading = false;
        this.errorMessage = 'Tidak ada sesi opname yang tersedia.';
        console.error('[SitePage] No opname session ID to continue');
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
        return;
      }
      
      this.opnameSessionService.getOpnameSession(this.site.opnameSessionID).subscribe({
        next: (opnameSession) => {
          this.opnameSession = opnameSession; // Store the current opname session data
          this.opnameLoading = false; // Set loading state to false after fetching session
          
          // Only continue if the session is active - MOVED THIS INSIDE THE SUCCESS CALLBACK
          if (this.opnameSession && this.opnameSession.status === 'Active') {
            this.opnameSessionService.continueOpname(this.site.opnameSessionID, this.site.siteID, this.router);
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
      const siteID = this.site.siteID;
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
