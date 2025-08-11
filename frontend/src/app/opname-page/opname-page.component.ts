import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OpnameAssetComponent } from '../opname-asset/opname-asset.component';
import { ApiService } from '../services/api.service';
import { OpnameSessionService } from '../services/opname-session.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { OpnameSession } from '../model/opname-session.model';
import { SiteInfo } from '../model/site-info.model';

@Component({
  selector: 'app-opname-page',
  standalone: true,
  imports: [CommonModule, FormsModule, OpnameAssetComponent],
  templateUrl: './opname-page.component.html',
  styleUrl: './opname-page.component.scss'
})
export class OpnamePageComponent implements OnInit, OnDestroy {
  // currentView: 'large' | 'small' = 'large';
  isMobile: boolean = false;
  
  constructor(private apiService: ApiService, private route: ActivatedRoute, private router: Router, private opnameSessionService: OpnameSessionService) {}
  
  cardVariant: 'default' | 'compact' = 'compact';
  showLocation: boolean = true;
  opnameSession: OpnameSession = {} as OpnameSession;
  site: SiteInfo = {} as SiteInfo;
  sessionID: number = -1; // Default value, will be set later
  siteID: number = -1; // Site ID for the current opname session
  isLoading: boolean = true; // Loading state for the opname session
  errorMessage: string = ''; // Error message for the opname session
  showToast: boolean = false;
  private subscription?: Subscription; // Subscription to manage service state

  ngOnInit() {
    this.isLoading = true;
    this.siteID = Number(this.route.snapshot.paramMap.get('id')); // Get site ID from route parameters
    this.initSessionID();
    this.initOpnameSession();
    this.initSiteInfo();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private initSessionID() {
    this.isLoading = true;
    
    // Method 1: Try to get from service (which now also checks localStorage)
    const serviceSessionId = this.opnameSessionService.getSessionId();
    if (serviceSessionId && serviceSessionId > 0) {
      this.sessionID = serviceSessionId;
      
      // If we have a session ID but no site ID from route, try to get it from localStorage
      if (this.siteID <= 0) {
        const siteid = this.opnameSessionService.getSiteId();
        if (siteid && siteid > 0) {
          this.siteID = siteid;
        }
      }
      return;
    }

    // Method 2: Try to get from router state (navigation extras)
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['sessionId']) {
      this.sessionID = navigation.extras.state['sessionId'];
      this.opnameSessionService.setSessionId(this.sessionID); // Also saves to localStorage
      return;
    }

    // Method 3: Try to get from history.state (direct navigation)
    if (history.state?.sessionId) {
      this.sessionID = history.state.sessionId;
      this.opnameSessionService.setSessionId(this.sessionID); // Also saves to localStorage
      return;
    }

    // If no session ID found, show error
    console.error('[OpnamePage] No session ID found in any source');
    
    // If we have a site ID, navigate back to that site
    if (this.siteID > 0) {
      this.router.navigate(['/site', this.siteID]);
    } else {
      // If we don't have a site ID either, navigate to dashboard
      this.router.navigate(['']);
    }
    
    this.errorMessage = 'Tidak ditemukan sesi opname. Silakan mulai sesi baru.';
    this.showToast = true;
    setTimeout(() => this.showToast = false, 3000);
  }

  private initOpnameSession() {
    this.isLoading = true;
    this.opnameSessionService.getOpnameSession(this.sessionID).subscribe({
      next: (session) => {
        this.opnameSession = session;
        this.isLoading = false; // Set loading state to false after fetching session
        
        // Update responsive settings based on screen size
        this.updateResponsiveSettings();
      },
      error: (error) => {
        this.isLoading = false; // Set loading state to false on error
        this.errorMessage = 'Gagal memuat sesi opname. Silakan coba lagi nanti.';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
        console.error('[OpnamePage] Error initializing opname session:', error);
      }
    });
  }

  private initSiteInfo() {
    this.isLoading = true;
    this.apiService.getSiteByID(this.siteID).subscribe({
      next: (site) => {
        this.site = site;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Gagal memuat informasi site. Silakan refresh halaman.';
        console.error('[OpnamePage] Error fetching site info:', error);
        this.isLoading = false;
      },
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    // this.checkScreenSize();
    this.updateResponsiveSettings();
  }

  cancelOpnameSession() {
    // Close the modal first
    this.closeModal('opnameCanceled');
    
    // This method will cancel the current stock opname session.
    if (this.sessionID <= 0) {
      console.error('[OpnamePage] Invalid session ID:', this.sessionID);
      this.errorMessage = 'Sesi opname tidak valid.';
      this.showToast = true;
      setTimeout(() => this.showToast = false, 3000);
      return;
    }
    
    this.isLoading = true; // Set loading state to true before cancelling
    this.opnameSessionService.cancelOpnameSession(this.sessionID).subscribe({
      next: (response) => {
        this.isLoading = false; // Set loading state to false after cancelling
        
        // Clear the session from the service and localStorage
        this.opnameSessionService.clearSession();
        
        // Navigate back to the site page
        this.router.navigate(['/site', this.siteID]);
      },
      error: (error) => {
        this.isLoading = false; // Set loading state to false on error
        this.errorMessage = 'Gagal membatalkan sesi opname. Silakan coba lagi nanti.';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
        console.error('[OpnamePage] Error cancelling opname session:', error);
      }
    });
  }

  get invalidSession(): string {
    // Invalid if there is no asset count
    const assetCount = localStorage.getItem('assetCount');
    if (!assetCount || parseInt(assetCount, 10) <= 0) {
      return 'asset-count';
    }

    // Invalid if there are still pending assets
    const pendingCount = localStorage.getItem('pendingCount');
    if (pendingCount && parseInt(pendingCount, 10) > 0) {
      return 'pending-count';
    }
    
    return '';
  }

  finishOpnameSession() {
    // Close the modal first
    this.closeModal('opnameFinished');
    
    // This method will finish the current stock opname session.
    if (this.sessionID <= 0) {
      console.error('[OpnamePage] Invalid session ID:', this.sessionID);
      this.errorMessage = 'Sesi opname tidak valid.';
      this.showToast = true;
      setTimeout(() => this.showToast = false, 3000);
      return;
    }

    // Can't finish if there are no assets in the session
    if (this.invalidSession === 'asset-count') {
      this.errorMessage = 'Tidak ada asset yang dipindai. Silakan pindai asset sebelum menyelesaikan sesi opname.';
      this.showToast = true;
      setTimeout(() => this.showToast = false, 3000);
      return;
    }

    // Can't finish if there are still pending assets
    if (this.invalidSession === 'pending-count') {
      this.errorMessage = 'Masih ada asset yang belum diproses. Silakan verifikasi atau perbarui data asset tersebut sebelum menyelesaikan sesi opname.';
      this.showToast = true;
      setTimeout(() => this.showToast = false, 3000);
      return;
    }

    this.isLoading = true; // Set loading state to true before finishing

    this.opnameSessionService.finishOpnameSession(this.sessionID).subscribe({
      next: () => {
        this.isLoading = false; // Set loading state to false after finishing

        // Clear the session from the service and localStorage !!!
        this.opnameSessionService.clearSession();
        
        // Navigate back to the site page
        this.router.navigate(['/site', this.siteID, 'report'], {
          queryParams: { session_id: this.sessionID, from: 'opname_page' }
        });
      },
      error: (error: any) => {
        this.isLoading = false; // Set loading state to false on error
        this.errorMessage = 'Sesi opname tidak dapat diselesaikan. Pastikan terdapat minimal satu asset dalam opname dan semua asset telah diproses.';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 5000);
        console.error('[OpnamePage] Error finishing opname session:', error);
      }
    });
  }

  private updateResponsiveSettings() {
    if (window.innerWidth >= 768) {
      // Large screens: use compact variant with location
      this.cardVariant = 'compact';
      this.showLocation = true;
    } else {
      // Small screens: use default variant without location
      this.cardVariant = 'default';
      this.showLocation = false;
    }
  }

  openModal(modalId: string) {
    setTimeout(() => {
      const modalElement = document.getElementById(modalId);

      if (modalElement) {
        try {
          const modal = new (window as any).bootstrap.Modal(modalElement, {
            backdrop: 'static',
            keyboard: false
          });
          modal.show();
        } catch (error) {
          console.error('[OpnamePage] Error creating/showing modal:', error);
        }
      } else {
        console.error('[OpnamePage] Modal element not found!');
      }
    }, 100);
  }

  // Close modal programmatically and clean up
  closeModal(modalId: string) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      try {
        const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        } else {
          const newModal = new (window as any).bootstrap.Modal(modalElement);
          newModal.hide();
        }
      } catch (error) {
        console.error('[OpnamePage] Error closing modal:', error);
      }
    } else {
      console.error('[OpnamePage] Modal element not found for closing:', modalId);
    }
  }
}