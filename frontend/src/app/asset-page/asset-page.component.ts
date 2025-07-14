import { Component, Input, OnInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Assetinfo } from '../model/assetinfo.model';
import { ApiService } from '../services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SitePageComponent } from '../site-page/site-page.component';
import { AssetCardComponent } from '../asset-card/asset-card.component';
import { OpnameSessionService } from '../services/opname-session.service';
import { AssetChange } from '../model/asset-changes.model';

@Component({
  selector: 'app-asset-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './asset-page.component.html',
  styleUrl: './asset-page.component.scss'
})
export class AssetPageComponent implements OnInit {
  @Input() isInOpnameSession: boolean = false; // Flag to check if in an opname session
  @Input() isEditable: boolean = false; // Flag to check if the user can edit assets in this opname session
  
  assetTag = input.required<string>();
  assetPage? : Assetinfo;
  sessionID: number = -1; // Default value, will be set later
  siteID: number = -1; // Site ID for the current opname session
  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';

  // Form data for editing
  formData: AssetChange & {newOwnerName?: string, newSiteName?: string} = {
    assetTag: '',
    newStatus: '',
    newStatusReason: '',
    newCondition: true,
    newConditionNotes: '',
    newLocation: '',
    newRoom: '',
    newOwnerID: -1,
    newSiteID: -1,
    changeReason: '',
    newOwnerName: '', // This is for UI purposes, not sent to backend directly
    newSiteName: '',
  };

  // Selected status reason (for radio buttons)
  selectedStatusReason: 'Loss' | 'Obsolete' = 'Obsolete';

  // File to upload for condition photo
  conditionPhoto?: File;

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
      siteName: 'N/A',
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

  initializeFormData(): void {
    if (!this.assetPage) return;
    
    // Initialize the form with current asset data
    this.formData = {
      assetTag: this.assetPage.assetTag,
      newStatus: this.assetPage.assetStatus,
      newStatusReason: this.assetPage.statusReason || '',
      newCondition: this.assetPage.condition,
      newConditionNotes: this.assetPage.conditionNotes,
      newLocation: this.assetPage.location || '',
      newRoom: this.assetPage.room || '',
      newOwnerID: this.assetPage.assetOwner,
      newOwnerName: this.assetPage.assetOwnerName, // For UI display
      newSiteID: this.assetPage.siteID,
      newSiteName: this.assetPage.siteName, // For UI display
      changeReason: ''
    };
    
    // Set selected status reason based on current status
    if (this.assetPage.statusReason === 'Loss') {
      this.selectedStatusReason = 'Loss';
    } else {
      this.selectedStatusReason = 'Obsolete';
    }
    
    // Update like/dislike based on condition
    this.isLiked = this.assetPage.condition;
    this.isDisliked = !this.assetPage.condition;
  }
  
  isLiked = false;
  isDisliked = false;

  setLike() {
    this.isLiked = true;
    this.isDisliked = false;
    if (this.formData) {
      this.formData.newCondition = true;
    }
  }

  setDislike() {
    this.isLiked = false;
    this.isDisliked = true;
    if (this.formData) {
      this.formData.newCondition = false;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.conditionPhoto = input.files[0];
      
      // For now, we're not actually uploading the image, just storing it in memory
      // In a real app, you'd upload this to a server and get a URL back
      // For now, we'll just set a placeholder
      this.formData.newConditionPhotoURL = 'photo_url_placeholder';
    }
  }

  onStatusChange(): void {
    // If the status is Disposed, make sure there's a reason
    if (this.formData.newStatus === 'Disposed' && this.selectedStatusReason) {
      this.formData.newStatusReason = this.selectedStatusReason;
    } else {
      this.formData.newStatusReason = '';
    }
  }

  onStatusReasonChange(): void {
    this.formData.newStatusReason = this.selectedStatusReason;
  }

  saveAssetChanges(): void {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';
    
    // Validate the form
    if (!this.formData.changeReason) {
      this.errorMessage = 'Please provide a reason for the changes.';
      this.isLoading = false;
      return;
    }
    if (!this.formData.newOwnerName) {
      this.errorMessage = 'Please provide an owner name.';
      this.isLoading = false;
      return;
    }
    if (!this.formData.newSiteName) {
      this.errorMessage = 'Please provide a site name.';
      this.isLoading = false;
    }
    
    console.log('[AssetPage] Saving asset changes:', this.formData);
    
    if (!this.sessionID || this.sessionID <= 0) {
      console.error('[AssetPage] Invalid session ID:', this.sessionID);
      this.errorMessage = 'Invalid session ID. Please start a new session.';
      this.isLoading = false;
      return;
    }
    
    // If the user entered a new owner name, we should ideally look up the corresponding ID
    // from a user service. For now, we'll keep the original owner ID.
    // In a real application, you would:
    // 1. Look up the user by name to get their ID
    // 2. Set the newOwnerID field with that ID
    // this.userService.getUserByName(this.formData.newOwnerName).subscribe(user => {
    //   this.formData.newOwnerID = user.id;
    // });
    
    // For this implementation, we'll prepare the asset changes for the API
    const assetChanges: AssetChange = {
      assetTag: this.formData.assetTag,
      newStatus: this.formData.newStatus,
      newStatusReason: this.formData.newStatusReason,
      newCondition: this.formData.newCondition,
      newConditionNotes: this.formData.newConditionNotes,
      newConditionPhotoURL: this.formData.newConditionPhotoURL,
      newLocation: this.formData.newLocation,
      newRoom: this.formData.newRoom,
      newOwnerID: this.formData.newOwnerID,
      newSiteID: this.formData.newSiteID,
      changeReason: this.formData.changeReason
    };
    
    // Send the changes to the backend
    this.processScannedAsset(assetChanges);
  }

  fetchAssetPage(): void {
    this.isLoading = true; // Set loading state to true before fetching data
    this.apiService.getAssetByAssetTag(this.assetTag()).subscribe({
      next: (asset) => {
        this.assetPage = asset; // Update the assetPage with the fetched data
        this.isLoading = false; // Set loading state to false after data is fetched
        
        // Initialize form data with current asset values
        this.initializeFormData();
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
      this.isLoading = false;
      return;
    }

    this.opnameSessionService.processScannedAsset(this.sessionID, assetChanges).subscribe({
      next: (response) => {
        console.log('[AssetPage] Asset processed successfully:', response);
        this.successMessage = 'Asset updated successfully!';
        this.isLoading = false;
        
        // Close the modal after a short delay to show the success message
        setTimeout(() => {
          // Use vanilla JS to close the Bootstrap modal
          const modalElement = document.getElementById(`edit-modal-${this.assetPage?.assetTag}`);
          if (modalElement) {
            // Access Bootstrap modal through the global window object
            const bsModal = (window as any).bootstrap;
            if (bsModal) {
              const modalInstance = bsModal.Modal.getInstance(modalElement);
              if (modalInstance) {
                modalInstance.hide();
              }
            } else {
              // Fallback: use data-bs-dismiss attribute to close modal
              const closeButton = modalElement.querySelector('button[data-bs-dismiss="modal"]');
              if (closeButton) {
                (closeButton as HTMLElement).click();
              }
            }
          }
          
          // Refresh the asset data to show updated information
          this.fetchAssetPage();
        }, 2000);
      },
      error: (error) => {
        console.error('[AssetPage] Failed to process asset:', error);
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Failed to process asset. Please try again later.';
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
