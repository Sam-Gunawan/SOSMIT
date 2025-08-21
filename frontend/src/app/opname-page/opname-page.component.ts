import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener, OnDestroy, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { OpnameAssetComponent } from '../opname-asset/opname-asset.component';
import { ApiService } from '../services/api.service';
import { OpnameSessionService } from '../services/opname-session.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { OpnameSession } from '../model/opname-session.model';
import { SiteInfo } from '../model/site-info.model';
import { DurationReminderComponent } from '../duration-reminder/duration-reminder.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Department } from '../model/dept.model';

@Component({
  selector: 'app-opname-page',
  standalone: true,
  imports: [CommonModule, FormsModule, OpnameAssetComponent, MatProgressBarModule],
  templateUrl: './opname-page.component.html',
  styleUrl: './opname-page.component.scss'
})
export class OpnamePageComponent implements OnInit, OnDestroy {
  // currentView: 'large' | 'small' = 'large';
  isMobile: boolean = false;
  
  constructor(private apiService: ApiService, private route: ActivatedRoute, private router: Router, private opnameSessionService: OpnameSessionService, public dialog: MatDialog) {}
  
  opnameSession: OpnameSession = {} as OpnameSession;
  site: SiteInfo = {} as SiteInfo;
  sessionID: number = -1; // Default value, will be set later
  siteID: number = -1; // Site ID for the current opname session
  deptID: number = -1; // Dept ID for the current opname session
  isLoading: boolean = true; 
  errorMessage: string = ''; 
  showToast: boolean = false;
  private subscription?: Subscription; // Subscription to manage service state

  ngOnInit() {
    this.isLoading = true;
    
    // Only handle query parameter navigation: /location/opname?site_id=... or dept_id=...
    const querySiteId = this.route.snapshot.queryParamMap.get('site_id');
    const queryDeptId = this.route.snapshot.queryParamMap.get('dept_id');
    
    if (querySiteId) {
      this.siteID = Number(querySiteId);
    } else if (queryDeptId) {
      this.deptID = Number(queryDeptId);
    }
    
    this.initSessionID();
    this.initOpnameSession();
    this.initSiteInfo();

    // Open the duration reminder dialog immediately when page loads
    const dialogRef = this.dialog.open(DurationReminderComponent, {
      width: '498px'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
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
      
      // Populate missing location (site / dept) from stored session info
      if (this.siteID <= 0 || this.deptID <= 0) {
        const location = this.opnameSessionService.getLocationId();
        if (location.id !== null && location.id > 0) {
          if (this.siteID <= 0 && location.type === 'site') this.siteID = location.id;
          if (this.deptID <= 0 && location.type === 'dept') this.deptID = location.id;
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
    
    this.navigateBackToLocation();
    
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
    
    // Determine if we're dealing with a site or department based on query params
    const queryDeptId = this.route.snapshot.queryParamMap.get('dept_id');
    
    if (queryDeptId) {
      // Handle department - get department info and treat it as site info for UI consistency
      this.apiService.getDeptByID(this.deptID).subscribe({
        next: (dept) => {
          // Map department info to site info structure for UI compatibility
          this.site = {
            siteID: dept.deptID,
            siteName: dept.deptName,
            siteGroupName: dept.siteGroupName,
            regionName: dept.regionName,
            opnameSessionID: dept.opnameSessionID
          };
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = 'Gagal memuat informasi departemen. Silakan refresh halaman.';
          console.error('[OpnamePage] Error fetching department info:', error);
          this.isLoading = false;
        }
      });
    } else {
      // Handle site - use original logic
      this.apiService.getSiteByID(this.siteID).subscribe({
        next: (site) => {
          this.site = site;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = 'Gagal memuat informasi site. Silakan refresh halaman.';
          console.error('[OpnamePage] Error fetching site info:', error);
          this.isLoading = false;
        }
      });
    }
  }

  private navigateBackToLocation() {
    const querySiteId = this.route.snapshot.queryParamMap.get('site_id');
    const queryDeptId = this.route.snapshot.queryParamMap.get('dept_id');
    
    if (querySiteId) {
      this.router.navigate(['/location'], { queryParams: { site_id: querySiteId } });
    } else if (queryDeptId) {
      this.router.navigate(['/location'], { queryParams: { dept_id: queryDeptId } });
    } else {
      // If we don't have any location info, navigate to dashboard
      this.router.navigate(['']);
    }
  }

  private navigateToReport() {
    const querySiteId = this.route.snapshot.queryParamMap.get('site_id');
    const queryDeptId = this.route.snapshot.queryParamMap.get('dept_id');
    
    if (querySiteId) {
      this.router.navigate(['/location/report'], {
        queryParams: { site_id: querySiteId, session_id: this.sessionID, from: 'opname_page' }
      });
    } else if (queryDeptId) {
      this.router.navigate(['/location/report'], {
        queryParams: { dept_id: queryDeptId, session_id: this.sessionID, from: 'opname_page' }
      });
    } else {
      // If we don't have any location info, navigate to dashboard
      this.router.navigate(['']);
    }
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
      next: () => {
        this.isLoading = false; // Set loading state to false after cancelling
        
        // Clear the session from the service and localStorage
        this.opnameSessionService.clearSession();
        
        this.navigateBackToLocation();
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
        
        this.navigateToReport();
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