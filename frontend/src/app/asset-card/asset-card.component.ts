import { Component, Input, OnInit, HostListener} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetInfo } from '../model/asset-info.model';
import { ApiService } from '../services/api.service';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { AssetPageComponent } from '../asset-page/asset-page.component';

@Component({
  selector: 'app-asset-card',
  imports: [CommonModule, AssetPageComponent],
  templateUrl: './asset-card.component.html',
  styleUrl: './asset-card.component.scss'
})
export class AssetCardComponent {
  @Input() variant: 'default' | 'compact' = 'default';
  @Input() showLocation: boolean = false;
  @Input() showHeader: boolean = true;
  @Input() isInOpnameSession: boolean = false; // Flag to check if in an opname session

  currentView: 'card' | 'list' = 'card';
  screenSize: 'large' | 'small' = 'large';
  isMobile: boolean = false;

  actualVariant: 'default' | 'compact' = 'default';
  actualShowLocation: boolean = false;

  assetsOnSite?: AssetInfo[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  showToast: boolean = false;

  constructor(private apiService: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.checkScreenSize();
    this.fetchAssetsOnSite(); // Fetch assets when the component initializes
    this.updateResponsiveSettings();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
    this.updateResponsiveSettings();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768; // Define mobile breakpoint
    
    if (this.isMobile) {
      this.currentView = 'list'; // Force list view on mobile
      this.screenSize = 'small';
    } else {
      this.currentView = 'card'; // Default to card view on desktop
      this.screenSize = 'large';
    }
  }

  toggleView(view: 'card' | 'list') {
    if (!this.isMobile) { // Only allow toggle on desktop
      this.currentView = view;
    }
  }

  private updateResponsiveSettings() {
    if (window.innerWidth >= 1000) {
      // Large screens: use the passed variant and showLocation
      this.actualVariant = this.variant;
      this.actualShowLocation = this.showLocation;
    } else {
      // Small screens: force default variant and hide location
      this.actualVariant = 'default';
      this.actualShowLocation = false;
    }
  }

  fetchAssetsOnSite(): void {
    this.isLoading = true;
    const siteID = Number(this.route.snapshot.paramMap.get('id'));
    this.apiService.getAssetsOnSite(siteID).subscribe({
      next: (assets) => {
        this.assetsOnSite = assets;
        this.isLoading = false;
        console.log('[AssetCard] Assets fetched successfully:', this.assetsOnSite);
      },
      error: (error) => {
        this.errorMessage = 'Failed to fetch assets. Please try again later.';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
        this.isLoading = false;
        console.error('[AssetCard] Error fetching assets:', error);
      }
    });
  }
}
