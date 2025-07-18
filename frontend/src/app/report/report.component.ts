import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { OpnameSessionService } from '../services/opname-session.service';
import { ActivatedRoute } from '@angular/router';
import { SiteInfo } from '../model/site-info.model';
import { OpnameAssetComponent } from '../opname-asset/opname-asset.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, OpnameAssetComponent, FormsModule],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss'
})
export class ReportComponent {
  @Input() selectedDate: string = ''; // Track selected date for filtering
  
  currentView: string = 'list';
  siteID: number = -1;
  site: SiteInfo = {} as SiteInfo;
  sessionID: number = -1;

  // Wrap both sessionID and endDate into an object
  availableOpnameSessions: { sessionID: number, endDate: string }[] = [];

  // Date options for dropdown
  dateOptions: { value: string, label: string }[] = [];
  
  cardVariant: 'default' | 'compact' = 'compact';
  showLocation: boolean = true;

  constructor(private apiService: ApiService, private opnameSessionService: OpnameSessionService, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {
    this.siteID = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.initSiteInfo();
    this.initAvailableOpnames();
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
      },
      error: (error) => {
        console.error('[Report] Error fetching available opname sessions:', error);
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
}
