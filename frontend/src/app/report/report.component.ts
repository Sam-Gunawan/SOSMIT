import { ChangeDetectorRef, Component, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { OpnameSessionService } from '../services/opname-session.service';
import { ReportService } from '../services/report.service';
import { ActivatedRoute } from '@angular/router';
import { SiteInfo } from '../model/site-info.model';
import { OpnameAssetComponent } from '../opname-asset/opname-asset.component';
import { FormsModule } from '@angular/forms';
import { ViewChild, ElementRef } from '@angular/core';
// import html2pdf from 'html2pdf.js'; // replaced by backend generated PDF
import { OpnameStats } from '../model/opname-stats.model';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, OpnameAssetComponent, FormsModule],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss'
})
export class ReportComponent {
  @Input() selectedDate: string = ''; // Track selected date for filtering
  
  currentView: 'list' | 'card' = 'card';
  isMobile: boolean = false;
  screenSize: 'large' | 'small' = 'large';
  siteID: number = -1;
  site: SiteInfo = {} as SiteInfo;
  sessionID: number = -1;
  successMessage: string = '';
  errorMessage: string = '';
  showSuccessToast: boolean = false;
  isExporting: boolean = false;
  isLoading: boolean = false;
  @ViewChild('exportSection', { static: false }) exportSection!: ElementRef;

  // Wrap both sessionID and endDate into an object
  availableOpnameSessions: { sessionID: number, endDate: string }[] = [];

  // Date options for dropdown
  dateOptions: { value: string, label: string }[] = [];

  // Opname statistics
  opnameStats: OpnameStats = {} as OpnameStats;
  
  cardVariant: 'default' | 'compact' = 'compact';
  showLocation: boolean = true;

  constructor(
    private apiService: ApiService,
    private opnameSessionService: OpnameSessionService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private reportService: ReportService
  ) {
    this.siteID = Number(this.route.snapshot.paramMap.get('id'));
  }

  async exportToPDF() {
    if (this.sessionID === -1) { this.errorMessage = 'Select a session first.'; return; }
    this.isExporting = true;
    try {
      const blob = await lastValueFrom(this.reportService.downloadBAPPdf(this.sessionID));
      const url = window.URL.createObjectURL(blob);
      // Attempt to extract filename from content-disposition if present later; fallback generic.
      const a = document.createElement('a');
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-GB').replace(/\//g,'-');
      a.href = url;
      a.download = `BAP_opname_${this.site?.siteName?.replace(/\s+/g,'_') || 'site'}_${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Report] PDF download failed', err);
      this.errorMessage = 'Failed to download PDF.';
    } finally {
      this.isExporting = false;
      this.cdr.detectChanges();
    }
  }

  ngOnInit() {
    this.checkScreenSize();
    this.initSiteInfo();
    this.initAvailableOpnames();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.checkScreenSize();
  }

  initSiteInfo() {
    this.apiService.getSiteByID(this.siteID).subscribe({
      next: (site) => {
        this.site = site;
        console.log('[Report] Site info fetched successfully:', this.site);
      },
      error: (error) => {
        console.error('[Report] Error fetching site info:', error);
      }
    });
  }

  initAvailableOpnames() {
    this.opnameSessionService.getOpnameOnSite(this.siteID).subscribe({
      next: (sessions) => {
        this.availableOpnameSessions = sessions.map(session => ({
          sessionID: Number(session.sessionID),
          endDate: session.endDate || ''
        }));
        console.log('[Report] Available opname sessions:', this.availableOpnameSessions);
        
        // Generate date options after data is loaded
        this.generateDateOptions();

        // Check for input from URL
        this.handleInputFromURL();
      },
      error: (error) => {
        console.error('[Report] Error fetching available opname sessions:', error);
        this.errorMessage = 'Gagal memuat sesi yang tersedia.';
      }
    });
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
      // Convert Observable to Promise using lastValueFrom
      const stats = await lastValueFrom(this.reportService.getOpnameStats(this.sessionID));
      this.opnameStats = stats;
      this.isLoading = false;
    } catch (error) {
      console.error('[Report] Error fetching opname stats:', error);
      this.errorMessage = 'Gagal memuat statistik opname.';
      this.isLoading = false;
    }
  }

  generateDateOptions() {
    this.dateOptions = this.availableOpnameSessions.map(s => ({
      value: s.endDate,
      label: new Date(s.endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    }));
    console.log('[Report] Date options generated:', this.dateOptions);
  }

  async onDateChange() {
    const found = this.availableOpnameSessions.find(s => s.endDate === this.selectedDate);
    this.sessionID = found ? found.sessionID : -1;

    if (found) {
      await this.initOpnameStats();
    }

    this.cdr.detectChanges();
  }

  private handleInputFromURL() {
    // Check if there's a selectedDate and selectedSessionID in query parameters
    // This is when a user was redirected after finishing an opname
    this.route.queryParams.subscribe(async params => {
      const selectedSessionID = params['session_id'];
      const from = params['from'];

      if (selectedSessionID) {
        this.sessionID = Number(selectedSessionID);
        console.log('[Report] Session ID from URL:', this.sessionID);
        
        // Find the corresponding date for this session ID
        const session = this.availableOpnameSessions.find(s => s.sessionID === this.sessionID);
        if (session) {
          this.selectedDate = session.endDate;
          console.log('[Report] Selected date from session:', this.selectedDate);
          await this.onDateChange();
          if (from === 'opname_page') {
            this.successMessage = 'Sesi opname berhasil diselesaikan!';
            this.showSuccessMessage();
          }
        } else {
          console.warn('[Report] No session found for ID:', this.sessionID);
          this.errorMessage = 'Sesi opname tidak ditemukan.';
        }
      }
    })
  }

  private showSuccessMessage() {
    this.showSuccessToast = true;
    setTimeout(() => {
      this.showSuccessToast = false;
      this.successMessage = ''; // Clear message after showing
    }, 5000); // Show for 5 seconds
  }

  private checkScreenSize() {
    const newIsMobile = window.innerWidth < 768; // Define mobile breakpoint
    const newScreenSize = newIsMobile ? 'small' : 'large';
    const newCurrentView = newIsMobile ? 'list' : 'card';
    
    // Only update if values have changed
    if (this.isMobile !== newIsMobile || this.screenSize !== newScreenSize || this.currentView !== newCurrentView) {
      this.isMobile = newIsMobile;
      this.screenSize = newScreenSize;
      this.currentView = newCurrentView;
      this.cdr.detectChanges(); // Only trigger change detection when needed
    }
  }

  toggleView(view: 'card' | 'list') {
    if (!this.isMobile) { // Only allow toggle on desktop view
      this.currentView = view;
    }
  }

  // isExporting: boolean = false;
  // @ViewChild('exportSection', { static: false }) exportSection!: ElementRef;

  // exportToPDF() {
  //   if (!this.exportSection) return;

  //   const options = {
  //     margin: 0.5,
  //     filename: 'opname-report.pdf',
  //     image: { type: 'jpeg', quality: 0.98 },
  //     html2canvas: { scale: 2 },
  //     jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  //   };

  //   // Clone the export section and inject the export CSS
  //   // const printContents = this.exportSection.nativeElement.cloneNode(true);
  //   // const style = document.createElement('link');
  //   // style.rel = 'stylesheet';
  //   // style.href = 'assets/report-export.css';
  //   // printContents.prepend(style);

  //   // html2pdf().from(printContents).set(options).save();
  //   html2pdf().from(this.exportSection.nativeElement).set(options).save();
  // }
}
