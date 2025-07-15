import { Component, HostListener, Input, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../services/api.service';
import { OpnameSessionService } from '../services/opname-session.service';
import { Assetinfo } from '../model/assetinfo.model';
import { AssetChange } from '../model/asset-changes.model';
import { OpnameSession } from '../model/opname-session.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetPageComponent } from '../asset-page/asset-page.component';
import { User } from '../model/user.model';

@Component({
  selector: 'app-opname-asset',
  imports: [CommonModule, FormsModule, AssetPageComponent],
  templateUrl: './opname-asset.component.html',
  styleUrl: './opname-asset.component.scss'
})
export class OpnameAssetComponent {
  @Input() variant: 'default' | 'compact' = 'default';
  @Input() showLocation: boolean = false;
  @Input() sessionID: number = -1; // Session ID for the current opname session
  @Input() siteID: number = -1; // Site ID for the current opname session

  // Search parameters
  searchQuery: string = '';
  searchType: 'asset_tag' | 'serial_number' = 'asset_tag'; // Default search type
  isSearching: boolean = false;

  // Assets - Each search result is stored as an object in this array (it is appended to the array)
  searchResults: Array<{
    existingAsset: Assetinfo,
    pendingAsset: Assetinfo,
    assetProcessed: boolean,
    processingStatus: 'pending' | 'all_good' | 'edited'
  }> = [];

  // Form data object for editing assets
  formData: AssetChange & {newOwnerName: string, newSiteName: string} = {
    assetTag: '',
    newStatus: '',
    newStatusReason: '',
    newCondition: true,
    newConditionNotes: '',
    newLocation: '',
    newRoom: '',
    newOwnerID: undefined,
    newSiteID: undefined,
    changeReason: '',

    // This is for UI purposes, not sent to backend
    newOwnerName: '',
    newSiteName: ''
  };

  // Form variables
  isLiked: boolean = true;
  isDisliked: boolean = false;
  selectedStatusReason: 'Loss' | 'Obsolete' = 'Obsolete';
  selectedNewUserID: number = -1; // This will be set when a user is selected from the datalist
  successMessage: string = '';

  // File to upload for condition photo
  // TODO: Implement actual file upload functionality
  conditionPhoto?: File;

  // Flags for responsive design
  currentView: 'card' | 'list' = 'card';
  screenSize: 'large' | 'small' = 'large'; // Default to large screen
  isMobile: boolean = false;
  actualVariant: 'default' | 'compact' = 'default';
  actualShowLocation: boolean = false;

  // Other properties
  opnameSession?: OpnameSession;
  allUsers: User[] = []; // List of all users in the company
  isLoading: boolean = false; // Loading state for fetching assets
  errorMessage: string = ''; // Error message for fetching assets

  constructor(
    private apiService: ApiService,
    private opnameSessionService: OpnameSessionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.checkScreenSize();
    this.updateResponsiveSettings();
    this.initOpnameData();
    this.getAllUsers();
    this.isLoading = false;
    this.errorMessage = '';
  }
  
  getAllUsers(): void {
    this.apiService.getAllUsers().subscribe({
      next: (userList) => {
        this.allUsers = [...userList];
        console.log('[OpnameAsset] All users fetched successfully:', this.allUsers);
      },
      error: (error) => {
        console.error('[OpnameAsset] Error fetching all users:', error);
        this.errorMessage = 'Failed to fetch user list. Please try again later.';
      }
    })
  }

  initOpnameData(): void {
    this.opnameSessionService.getOpnameSession(this.sessionID).subscribe({
      next: (session: OpnameSession) => {
        this.opnameSession = session;
        this.actualVariant = this.variant;
        this.actualShowLocation = this.showLocation;
        console.log('[OpnameAsset] Opname session loaded:', session);
      },
      error: (error) => {
        console.error('[OpnameAsset] Error loading opname session:', error);
        this.errorMessage = 'Failed to load opname session. Please try again later.';
      }
    });
  }

  // Initialize form data for a newly searched asset
  initFormData(index: number): void {
    const result = this.searchResults[index];
    const asset = result.existingAsset;
    this.formData = {
      assetTag: asset.assetTag,
      newStatus: asset.assetStatus,
      newStatusReason: asset.statusReason,
      newCondition: asset.condition,
      newConditionNotes: asset.conditionNotes,
      newLocation: asset.location,
      newRoom: asset.room,
      newOwnerID: asset.assetOwner,
      newSiteID: asset.siteID,
      changeReason: '',
      newOwnerName: asset.assetOwnerName,
      newSiteName: asset.siteName
    }

    // Reset condition UI state
    this.isLiked = asset.condition;
    this.isDisliked = !asset.condition;
  }

  @HostListener('window:resize', ['$event']) onResize(event: any) {
    this.updateResponsiveSettings();
    this.checkScreenSize();
  }

  setSearchType(type: 'asset_tag' | 'serial_number') {
    this.searchType = type;
  }  

  // Handle the search action
  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.errorMessage = 'Please type something into the search bar.';
      return;
    }

    this.isSearching = true;
    this.errorMessage = ''; // Clear previous error message

    console.log('[OpnameAsset] Starting search for:', this.searchQuery, 'by', this.searchType);

    // Check if the seached asset already exists in the search results
    const alreadyExists = this.searchResults.some(result => (
      result.existingAsset.assetTag === this.searchQuery.toUpperCase() ||
      result.existingAsset.serialNumber === this.searchQuery.toUpperCase()
    ));

    if (alreadyExists) {
      this.isSearching = false;
      this.errorMessage = 'Asset already exists in the search results. Please check the list.';
      console.log('[OpnameAsset] Asset already exists in search results:', this.searchQuery);
      return;
    }

    // Call the universal search method from API service.
    this.apiService.searchAsset(this.searchQuery, this.searchType).subscribe({
      next: (asset) => {
        console.log('[OpnameAsset] Asset found from search:', asset);

        // Add the found asset to the search results.
        this.searchResults.push({
          existingAsset: asset,
          pendingAsset: asset, // Initially, the pending asset is the same as the existing asset
          assetProcessed: false,
          processingStatus: 'pending' // Initial processing status
        });

        this.isSearching = false;
        this.searchQuery = ''; // Clear the search input after successful search
      },
      error: (error) => {
        console.error('[OpnameAsset] Error during search:', error);
        this.isSearching = false;
        this.errorMessage = 'Asset not found. Please check the asset tag or serial number.';
      }      
    });
  }

  // Handle file selection for condition photo
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

  setLike(): void {
    this.isLiked = true;
    this.isDisliked = false;
    this.formData.newCondition = true;
  }

  setDislike(): void {
    this.isLiked = false;
    this.isDisliked = true;
    this.formData.newCondition = false;
  }

  // Handle owner name input change
  onOwnerInputChange(index: number): void {
    const result = this.searchResults[index];
    const input = this.formData.newOwnerName.trim().toLowerCase() || '';
    const matchedUser = this.allUsers.find(user => (
      `${user.firstName} ${user.lastName}`.toLowerCase() === input ||
      (user.email.toLowerCase() === input)
    ));

    if (matchedUser) {
      this.formData.newOwnerID = matchedUser.userID;
      this.formData.newOwnerName = `${matchedUser.firstName} ${matchedUser.lastName}`;

      // Update the pending asset with the owner biodata
      result.pendingAsset.assetOwnerName = this.formData.newOwnerName;
      result.pendingAsset.assetOwner = matchedUser.userID;
      result.pendingAsset.assetOwnerPosition = matchedUser.position;
      result.pendingAsset.assetOwnerCostCenter = matchedUser.costCenterID;
      result.pendingAsset.siteID = matchedUser.siteID;
      result.pendingAsset.siteName = matchedUser.siteName;
      result.pendingAsset.siteGroupName = matchedUser.siteGroupName;
      result.pendingAsset.regionName = matchedUser.regionName;

      // Force change detection to update the view
      this.cdr.detectChanges();
    } else {
      console.error('[OpnameAsset] No matching user found for input:', input);
      this.formData.newOwnerID = undefined;
    }
  }

  // Handle status changes
  onStatusChange(): void {
    // Reset status reason when status changes
    this.formData.newStatusReason = '';
  }

  // Handle status reason changes so that it updates the formData
  onStatusReasonChange(): void {
    this.formData.newStatusReason = this.selectedStatusReason;
  }

  // Process the asset change from the edit modal
  processAssetChange(index: number): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Validate the index to ensure it is within bounds of the search results array
    if (index < 0 || index >= this.searchResults.length) {
      console.error('[OpnameAsset] Invalid index for asset changes:', index);
      this.errorMessage = 'Invalid asset index. Please try again.';
      return;
    }

    // Validate the required input fields
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
      return;
    }

    // Get the asset from the search results at the specified index
    const result = this.searchResults[index];
    const assetChanges: AssetChange = {
      assetTag: result.existingAsset.assetTag,
      newStatus: this.formData.newStatus,
      newStatusReason: this.formData.newStatusReason,
      newCondition: this.formData.newCondition,
      newConditionNotes: this.formData.newConditionNotes,
      newConditionPhotoURL: this.formData.newConditionPhotoURL,
      newLocation: this.formData.newLocation,
      newRoom: this.formData.newRoom,
      newOwnerID: this.formData.newOwnerID,
      newSiteID: this.formData.newSiteID,
      changeReason: this.formData.changeReason,
    };
    
    console.log('[OpnameAsset] Processing asset change: ', assetChanges);

    // Set loading state while processing
    this.isSearching = true; 
    this.isLoading = true;

    console.log('[OpnameAsset] Processing new asset change:', assetChanges);
    this.opnameSessionService.processScannedAsset(this.sessionID, assetChanges).subscribe({
      next: (response) => {
        console.log('[OpnameAsset] Asset processed successfully:', response);
        result.assetProcessed = true; // Mark the asset as processed
        
        // Check if there are any changes to apply
        if (response.assetChanges && Object.keys(response.assetChanges).length > 0) {
          result.processingStatus = 'edited';
          console.log('[OpnameAsset] Changes detected, updating pending asset:', response.assetChanges);  

          // Update the existing asset with the new changes
          result.pendingAsset = {
            ...result.pendingAsset,
            ...response.assetChanges
          } as Assetinfo; // Ensure the pending asset is of type Assetinfo

        } else { // No changes to apply
          result.processingStatus = 'all_good';
          result.pendingAsset = { ...result.existingAsset };
        }

        console.log('[OpnameAsset] Updated asset:', result.pendingAsset);

        this.isSearching = false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('[OpnameAsset] Error processing asset:', error);
        this.errorMessage = 'Failed to process asset. Please try again later.';
        this.isSearching = false;
        this.isLoading = false;
        return; // Exit early on error
      }
    });
    
    this.closeBootstrapModal(result);
    this.successMessage = 'Asset verification processed successfully.';
  }

  // Mark as all good, i.e. no changes available
  markAsAllGood(index: number): void {
    // Validate index number
    if (index < 0 || index >= this.searchResults.length) {
      console.error("[from markAsAllGood(index)]: index error -> index = ", index)
      return;
    }

    const result = this.searchResults[index]
    const assetChanges: AssetChange = {
      assetTag: result.existingAsset.assetTag,
      newStatus: result.existingAsset.assetStatus,
      changeReason: "No changes. Asset verified on " + this.opnameSession?.startDate
    }

    this.isLoading = true;
    this.opnameSessionService.processScannedAsset(this.sessionID, assetChanges).subscribe({
      next: () => {
        result.pendingAsset = { ...result.existingAsset } // No changes, so pending is same as existing
        result.assetProcessed = true
        result.processingStatus = 'all_good'

        this.initFormData(index); // Reinitialize form data for the asset
        
        this.isLoading = false;
        this.successMessage = 'Asset marked as all good. No changes.';
      },
      error: (error) => {
        this.errorMessage = 'Failed to mark asset as verified: ' + (error.message || 'Unkown error');
        this.isLoading = false;
        return;
      }
    });
    
    this.closeBootstrapModal(result);
  }

  // Remove a specific asset from the search results
  // TODO: Implement this on a remove button click in the template
  removeAsset(index: number): void {
    // Validate the index to ensure it is within bounds of the search results array
    if (index < 0 || index >= this.searchResults.length) {
      console.error('[OpnameAsset] Invalid index for asset removal:', index);
      this.errorMessage = 'Invalid asset index. Please try again.';
      return;
    }

    console.log('[OpnameAsset] Removing asset at index:', index);
    this.searchResults.splice(index, 1); // Remove the asset from the search results
  }

  // TODO: Find a way to 'save' progress in the current session
  // This could be done by periodically saving the search results to the OpnameSessionService
  // or by implementing a 'save' button that triggers a save action.
  // We can also consider auto-saving the session when processing assets.

  // TODO: Implement a method to find owner's ID based on their full name from the forms

  // TODO: Implement a method to find the site ID based on the site name from the forms

  // TODO: Implement a search recommendation feature that suggests user's names and site names based on the search query as they type per letter.
  
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
    if (!this.isMobile) { // Only allow toggle on desktop view
      this.currentView = view;
    }
  }

  private updateResponsiveSettings() {
      // Update responsive settings based on current view and device type
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

  private closeBootstrapModal(result: any): void {
    // Close the modal after a short delay to show the success message
    setTimeout(() => {
      // Use vanilla JS to close the Bootstrap modal
      const modalElement = document.getElementById(`edit-modal-${result.existingAsset.assetTag}`);
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
      
      // Add this code to remove the modal backdrop
      const modalBackdrop = document.querySelector('.modal-backdrop');
      if (modalBackdrop) {
        modalBackdrop.remove();
      }
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
    })
  }
}
