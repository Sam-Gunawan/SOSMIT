import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { OpnameSessionService } from '../services/opname-session.service';
import { ActivatedRoute } from '@angular/router';
import { SiteInfo } from '../model/site-info.model';
import { OpnameAssetComponent } from '../opname-asset/opname-asset.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-report',
  imports: [CommonModule, OpnameAssetComponent, FormsModule],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss'
})
export class ReportComponent {
  @Input() selectedDate: string = ''; // Track selected date for filtering
  
  currentView: string = 'list';
  siteID: number = -1;
  site: SiteInfo = {} as SiteInfo;
  
  cardVariant: 'default' | 'compact' = 'compact';
  showLocation: boolean = true;

  constructor(private apiService: ApiService, private opnameSessionService: OpnameSessionService, private route: ActivatedRoute) {
    this.siteID = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.initSiteInfo();
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

}
