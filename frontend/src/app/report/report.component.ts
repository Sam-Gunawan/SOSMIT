import { ChangeDetectorRef, Component, Host, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { OpnameSessionService } from '../services/opname-session.service';
import { ActivatedRoute } from '@angular/router';
import { SiteInfo } from '../model/site-info.model';
import { OpnameAssetComponent } from '../opname-asset/opname-asset.component';
import { FormsModule } from '@angular/forms';
import { ViewChild, ElementRef } from '@angular/core';
import html2pdf from 'html2pdf.js';

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
  isExporting = false;
  @ViewChild('exportSection', { static: false }) exportSection!: ElementRef;

  // Wrap both sessionID and endDate into an object
  availableOpnameSessions: { sessionID: number, endDate: string }[] = [];

  // Date options for dropdown
  dateOptions: { value: string, label: string }[] = [];
  
  cardVariant: 'default' | 'compact' = 'compact';
  showLocation: boolean = true;

  constructor(private apiService: ApiService, private opnameSessionService: OpnameSessionService, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {
    this.siteID = Number(this.route.snapshot.paramMap.get('id'));
  }

  async exportToPDF() {
    this.isExporting = true;
    this.cdr.detectChanges(); // Ensure the export section is rendered

    // Wait a tick to ensure DOM is updated
    setTimeout(async () => {
      const options = {
        margin: 0.5,
        filename: 'opname-report.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
      };

      const element = this.exportSection.nativeElement;
      await html2pdf().from(element).set(options).save();

      this.isExporting = false;
      this.cdr.detectChanges();
    }, 0);
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
        this.errorMessage = 'Failed to load available sessions.';
      }
    });
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

  onDateChange() {
    const found = this.availableOpnameSessions.find(s => s.endDate === this.selectedDate);
    this.sessionID = found ? found.sessionID : -1;
    console.log('[Report] Date changed to:', this.selectedDate, 'Session ID:', this.sessionID);
    this.cdr.detectChanges();
  }

  private handleInputFromURL() {
    // Check if there's a selectedDate and selectedSessionID in query parameters
    // This is when a user was redirected after finishing an opname
    this.route.queryParams.subscribe(params => {
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
          this.onDateChange(); // Trigger date change logic
          if (from === 'opname_page') {
            this.successMessage = 'Opname session finished successfully!';
            this.showSuccessMessage();
          }
        } else {
          console.warn('[Report] No session found for ID:', this.sessionID);
          this.errorMessage = 'Session not found.';
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
