import { ChangeDetectorRef, Component, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { OpnameSessionService } from '../services/opname-session.service';
import { ReportService } from '../services/report.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SiteInfo } from '../model/site-info.model';
import { OpnameSession } from '../model/opname-session.model';
import { OpnameAssetComponent } from '../opname-asset/opname-asset.component';
import { FormsModule } from '@angular/forms';
import { ViewChild, ElementRef } from '@angular/core';
// import html2pdf from 'html2pdf.js'; // replaced by backend generated PDF
import { OpnameStats } from '../model/opname-stats.model';
import { lastValueFrom } from 'rxjs';
import { Department } from '../model/dept.model';
import { LoadingOverlayComponent } from '../shared/loading-overlay/loading-overlay.component';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, OpnameAssetComponent, FormsModule, LoadingOverlayComponent],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss'
})
export class ReportComponent {
  @Input() selectedDate: string = ''; // Track selected date for filtering
  
  siteID: number = -1;
  deptID: number = -1;
  site: SiteInfo = {} as SiteInfo;
  dept: Department = {} as Department;
  opnameSession: OpnameSession = {} as OpnameSession;
  sessionID: number = -1;
  successMessage: string = '';
  errorMessage: string = '';
  showSuccessToast: boolean = false;
  isExporting: boolean = false;
  isLoading: boolean = false;
  exportingType: 'pdf' | 'csv' | null = null;

  // Wrap both sessionID and endDate into an object
  availableOpnameSessions: { sessionID: number, endDate: string }[] = [];

  // Date options for dropdown
  dateOptions: { value: string, label: string }[] = [];

  // Opname statistics
  opnameStats: OpnameStats = {} as OpnameStats;

  constructor(
    private apiService: ApiService,
    private opnameSessionService: OpnameSessionService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private reportService: ReportService,
    private router: Router
  ) {}

  ngOnInit() {
    // Handle query parameter initialization in ngOnInit instead of constructor
    this.initFromQueryParams();
  }

  private initFromQueryParams() {
    // Subscribe to query parameter changes to get current values
    this.route.queryParams.subscribe(params => {
      const querySiteId = params['site_id'];
      const queryDeptId = params['dept_id'];
      const querySessionId = params['session_id'];
      
      // Reset values first
      this.siteID = -1;
      this.deptID = -1;
      this.sessionID = -1;
      
      if (querySiteId) {
        this.siteID = Number(querySiteId);
        if (querySessionId) {
          this.sessionID = Number(querySessionId);
        }
      } else if (queryDeptId) {
        // Department-based query parameter routing
        this.deptID = Number(queryDeptId);
        if (querySessionId) {
          this.sessionID = Number(querySessionId);
        }
      }
      
      console.log('[Report] Initialized from query params - siteID:', this.siteID, 'deptID:', this.deptID, 'sessionID:', this.sessionID);
      
      // Initialize location info and available opnames after getting query params
      this.initLocationInfo();
      this.initAvailableOpnames();
    });
  }

  async exportToPDF() {
    if (this.sessionID === -1) { this.errorMessage = 'Select a session first.'; return; }
    this.isExporting = true;
    this.exportingType = 'pdf';
    try {
      const blob = await lastValueFrom(this.reportService.downloadBAPPdf(this.sessionID));
      const url = window.URL.createObjectURL(blob);
      
      // Attempt to extract filename from content-disposition if present later; fallback generic.
      const a = document.createElement('a');
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-GB').replace(/\//g,'-');
      
      a.href = url;
      a.download = `BAP_opname_${this.site?.siteName?.replace(/\s+/g,'_') || this.dept?.deptName?.replace(/\s+/g,'_') || 'location'}_${dateStr}.pdf`;
      document.body.appendChild(a);
      
      a.click();
      document.body.removeChild(a);
      
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Report] PDF download failed', err);
      this.errorMessage = 'Failed to download PDF.';
    } finally {
      this.isExporting = false;
      this.exportingType = null;
      this.cdr.detectChanges();
    }
  }

  async exportToCSV() {
    if (this.sessionID === -1) { this.errorMessage = 'Select a session first.'; return; }
    this.isExporting = true;
    this.exportingType = 'csv';
    try {
      // TODO: Implement CSV export service call
      // const blob = await lastValueFrom(this.reportService.downloadBAPCsv(this.sessionID));
      console.log('[Report] CSV export not implemented yet for session:', this.sessionID, " isExporting: ", this.isExporting);
      this.errorMessage = 'CSV export feature coming soon.';

    } catch (err) {
      console.error('[Report] CSV download failed', err);
      this.errorMessage = 'Failed to download CSV.';
    } finally {
      this.isExporting = false;
      this.exportingType = null;
      this.cdr.detectChanges();
    }
  }

  // Helper methods for loading overlay
  getLoadingTitle(): string {
    return this.exportingType === 'pdf' ? 'Generating PDF Report' : 'Generating CSV Report';
  }

  getLoadingMessage(): string {
    return 'Please wait while we prepare your file...';
  }

  getLoadingColor(): string {
    return this.exportingType === 'pdf' ? '#007bff' : '#16a085';
  }

  initLocationInfo() {
    if (this.siteID > 0) {
      this.apiService.getSiteByID(this.siteID).subscribe({
        next: (site) => {
          this.site = site;
        },
        error: (error) => {
          console.error('[Report] Error fetching site info:', error);
        }
      });
    } else if (this.deptID > 0) {
      this.apiService.getDeptByID(this.deptID).subscribe({
        next: (dept) => {
          this.dept = dept;
        },
        error: (error) => {
          console.error('[Report] Error fetching department info:', error);
        }
      });
    }
  }

  initAvailableOpnames() {
    this.opnameSessionService.getOpnameOnLocation(this.siteID, this.deptID).subscribe({
      next: (sessions) => {
        this.availableOpnameSessions = sessions.map(session => ({
          sessionID: Number(session.sessionID),
          endDate: session.endDate || ''
        }));
        console.log('[Report] Available opname sessions:', this.availableOpnameSessions);
        
        // Generate date options after data is loaded
        this.generateDateOptions();

        // Auto-select date if sessionID is provided in URL
        this.autoSelectDateFromSessionID();

        // Update opname display with chosen date (if provided)
        this.initOpnameStats();
      },
      error: (error) => {
        console.error('[Report] Error fetching available opname sessions:', error);
        this.errorMessage = 'Gagal memuat sesi yang tersedia.';
      }
    });
  }

  private autoSelectDateFromSessionID() {
    if (this.sessionID > 0) {
      // Find the session that matches the sessionID from URL
      const matchingSession = this.availableOpnameSessions.find(s => s.sessionID === this.sessionID);
      if (matchingSession) {
        this.selectedDate = matchingSession.endDate;
        console.log('[Report] Auto-selected date from sessionID:', this.selectedDate, 'for session:', this.sessionID);
      } else {
        console.warn('[Report] No session found for sessionID from URL:', this.sessionID);
        this.errorMessage = 'Sesi opname tidak ditemukan.';
      }
    }
  }

  async initOpnameStats() {
    this.isLoading = true;
    
    if (this.sessionID === -1) {
      this.errorMessage = 'Tidak ada sesi yang dipilih.';
      console.error('[Report] Error: No session selected for stats.');
      this.isLoading = false;
      return;
    }

    try {
      // Fetch both stats and session details
      const [stats, session] = await Promise.all([
        lastValueFrom(this.reportService.getOpnameStats(this.sessionID)),
        lastValueFrom(this.opnameSessionService.getOpnameSession(this.sessionID))
      ]);
      
      this.opnameStats = stats;
      this.opnameSession = session;
      this.isLoading = false;
      console.log('[Report] Opname session fetched successfully:', this.opnameSession);
    } catch (error) {
      console.error('[Report] Error fetching opname data:', error);
      this.errorMessage = 'Gagal memuat data opname.';
      this.isLoading = false;
    }
  }

  generateDateOptions() {
    this.dateOptions = this.availableOpnameSessions.map(s => ({
      value: s.endDate,
      label: new Date(s.endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      })
    }));
    console.log('[Report] Date options generated:', this.dateOptions);
  }

  async onDateChange() {
    // User manually picked a date; derive sessionID then push to URL (URL becomes single source of truth)
    const found = this.availableOpnameSessions.find(s => s.endDate === this.selectedDate);
    const newSessionID = found ? found.sessionID : -1;

    // If nothing changed, do nothing
    if (newSessionID === this.sessionID) return;

    // Navigate updating only the session_id param; keep existing others except transient 'from'
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { session_id: newSessionID > 0 ? newSessionID : null, from: undefined },
      queryParamsHandling: 'merge'
    });
  }

  // private handleInputFromURL() {
  //   // Single subscription that drives component state from URL params
  //   this.route.queryParams.subscribe(async params => {
  //     const selectedSessionID = params['session_id'];
  //     const from = params['from'];

  //     if (selectedSessionID) {
  //       const newSessionID = Number(selectedSessionID);
  //       if (newSessionID !== this.sessionID) {
  //         this.sessionID = newSessionID;
  //         const session = this.availableOpnameSessions.find(s => s.sessionID === this.sessionID);
  //         if (session) {
  //           this.selectedDate = session.endDate;
  //           console.log('[Report] Synced from URL -> session:', this.sessionID, 'date:', this.selectedDate);
  //           await this.initOpnameStats();
  //         } else {
  //           console.warn('[Report] No session found for ID from URL:', this.sessionID);
  //           this.errorMessage = 'Sesi opname tidak ditemukan.';
  //         }
  //       }
  //     } else {
  //       // No session specified -> reset
  //       this.sessionID = -1;
  //       this.selectedDate = '';
  //     }

  //     if (from === 'opname_page') {
  //       this.successMessage = 'Sesi opname berhasil diselesaikan!';
  //       this.showSuccessMessage();
  //       // Clean up the transient param after showing message
  //       this.router.navigate([], { relativeTo: this.route, queryParams: { from: undefined }, queryParamsHandling: 'merge' });
  //     }
  //     this.cdr.detectChanges();
  //   });
  // }

  private showSuccessMessage() {
    this.showSuccessToast = true;
    setTimeout(() => {
      this.showSuccessToast = false;
      this.successMessage = ''; // Clear message after showing
    }, 5000); // Show for 5 seconds
  }
}