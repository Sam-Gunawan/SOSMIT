import { Component, Input, OnInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Assetinfo } from '../model/assetinfo.model';
import { ApiService } from '../services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SitePageComponent } from '../site-page/site-page.component';
import { AssetCardComponent } from '../asset-card/asset-card.component';
import { OpnameSessionService } from '../services/opname-session.service';
import { AssetChange } from '../model/asset-changes.model';

@Component({
  selector: 'app-asset-page',
  imports: [CommonModule],
  templateUrl: './asset-page.component.html',
  styleUrl: './asset-page.component.scss'
})
export class AssetPageComponent {
  @Input() isInOpnameSession: boolean = false; // Flag to check if in an opname session
  
  assetTag = input.required<string>();
  assetPage? : Assetinfo;
  sessionID: number = -1; // Default value, will be set later
  siteID: number = -1; // Site ID for the current opname session
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(private apiService: ApiService, private router: Router, private opnameSessionService: OpnameSessionService, private route: ActivatedRoute) {
    // TODO: separate assetPage and assetCard sql function. make one for each and fetch only the displayed info.
    this.assetPage = {
      assetTag: 'N/A',
      assetIcon: '',
      serialNumber: 'N/A',
      assetStatus: 'Down',
      category: 'N/A',
      subCategory: 'N/A',
      productVariety: 'N/A',
      assetBrand: 'N/A',
      assetName: 'N/A',
      condition: true,
      conditionNotes: 'N/A',
      conditionPhotoURL: '',
      location: '',
      room: '',
      assetOwner: -1,
      assetOwnerName: 'N/A',
      assetOwnerPosition: 'N/A',
      assetOwnerCostCenter: -1,
      siteID: -1,
      siteGroupName: 'N/A',
      regionName: 'N/A',
    }; 
  }
  
  ngOnInit(): void {
    this.fetchAssetPage(); // Fetch asset page data when the component initializes
    this.siteID = Number(this.route.snapshot.paramMap.get('id')); // Get site ID from route parameters
    if (this.isInOpnameSession) {
      this.initializeSessionId(); // Initialize session ID if in an opname session
    }
  }
  
  isLiked = false;
  isDisliked = false;

  setLike() {
    this.isLiked = true;
    this.isDisliked = false;
  }

  setDislike() {
    this.isLiked = false;
    this.isDisliked = true;
  }

  fetchAssetPage(): void {
    this.isLoading = true; // Set loading state to true before fetching data
    this.apiService.getAssetDetails(this.assetTag()).subscribe({
      next: (asset) => {
        this.assetPage = asset; // Update the assetPage with the fetched data
        this.isLoading = false; // Set loading state to false after data is fetched
        console.log('[AssetPage] Asset fetched successfully:', this.assetPage);
      },
      error: (error) => {
        // Handle the error appropriately, e.g., show a message to the user
        console.error('[AssetPage] Failed to fetch asset:', error);
        this.isLoading = false; // Set loading state to false even if there's an error
        this.errorMessage = 'Failed to load asset. Please try again later.';
      }
    });
  }

  processScannedAsset(assetChanges: AssetChange): void {
    this.isLoading = true;
    console.log('[AssetPage] Processing asset changes:', assetChanges);
    if (!this.sessionID || this.sessionID <= 0) {
      console.error('[AssetPage] Invalid session ID:', this.sessionID);
      this.errorMessage = 'Invalid session ID. Please start a new session.';
      return;
    }

    this.opnameSessionService.processScannedAsset(this.sessionID, assetChanges).subscribe({
      next: (response) => {
        console.log('[AssetPage] Asset processed successfully:', response);
        // Optionally, you can navigate to another page or show a success message
        this.isLoading = false;
      },
      error: (error) => {
        console.error('[AssetPage] Failed to process asset:', error);
        this.isLoading = false;
        this.errorMessage = 'Failed to process asset. Please try again later.';
      }
    });
  }

  private initializeSessionId() {
    this.isLoading = true;
    // Method 1: Try to get from router state (navigation extras)
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['sessionId']) {
      this.sessionID = navigation.extras.state['sessionId'];
      console.log('[OpnamePage] Session ID from router state:', this.sessionID);
      this.opnameSessionService.setSessionId(this.sessionID);
      this.isLoading = false;
      return;
    }

    // Method 2: Try to get from service (if already set)
    const serviceSessionId = this.opnameSessionService.getSessionId();
    if (serviceSessionId && serviceSessionId > 0) {
      this.sessionID = serviceSessionId;
      console.log('[OpnamePage] Session ID from service:', this.sessionID);
      this.isLoading = false;
      return;
    }

    // Method 3: Try to get from history.state (direct navigation)
    if (history.state?.sessionId) {
      this.sessionID = history.state.sessionId;
      console.log('[OpnamePage] Session ID from history state:', this.sessionID);
      this.opnameSessionService.setSessionId(this.sessionID);
      this.isLoading = false;
      return;
    }

    // If no session ID found, show error
    console.error('[OpnamePage] No session ID found in any source');
    this.router.navigate(['/site', this.siteID]); // Navigate to site page if no session ID
    this.errorMessage = 'No opname session found. Please start a new session.';
    this.isLoading = false;
  }
}
