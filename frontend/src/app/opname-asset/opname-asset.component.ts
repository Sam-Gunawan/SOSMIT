import { Component, HostListener, Input, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../services/api.service';
import { OpnameSessionService } from '../services/opname-session.service';
import { AssetInfo } from '../model/asset-info.model';
import { AssetChange } from '../model/asset-changes.model';
import { OpnameSession } from '../model/opname-session.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetPageComponent } from '../asset-page/asset-page.component';
import { User } from '../model/user.model';
import { SiteInfo } from '../model/site-info.model';
import { OpnameSessionProgress } from '../model/opname-session-progress.model';
import { popResultSelector } from 'rxjs/internal/util/args';

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
    existingAsset: AssetInfo,
    pendingAsset: AssetInfo,
    assetProcessed: boolean,
    processingStatus: 'pending' | 'all_good' | 'edited',
    savedChangeReason: string,
    formData: AssetChange & {newOwnerName: string, newSiteName: string}
  }> = [];

  // Currently selected asset index for form editing
  currentAssetIndex: number = -1;

  // Helper method to create empty form data
  private createEmptyFormData(): AssetChange & {newOwnerName: string, newSiteName: string} {
    return {
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
      newOwnerName: '',
      newSiteName: ''
    };
  }

  // Get current form data for the active asset
  get currentFormData(): AssetChange & {newOwnerName: string, newSiteName: string} {
    if (this.currentAssetIndex >= 0 && this.currentAssetIndex < this.searchResults.length) {
      return this.searchResults[this.currentAssetIndex].formData;
    }
    return this.createEmptyFormData();
  }

  // Helper method to create form data from an asset
  private createFormDataFromAsset(asset: AssetInfo, changeReason: string = ''): AssetChange & {newOwnerName: string, newSiteName: string} {
    return {
      assetTag: asset.assetTag,
      newStatus: asset.assetStatus,
      newStatusReason: asset.statusReason,
      newCondition: asset.condition,
      newConditionNotes: asset.conditionNotes,
      newConditionPhotoURL: asset.conditionPhotoURL,
      newLocation: asset.location,
      newRoom: asset.room,
      newOwnerID: asset.assetOwner,
      newSiteID: asset.siteID,
      changeReason: changeReason,
      newOwnerName: asset.assetOwnerName,
      newSiteName: asset.siteName
    };
  }

  // Unified method to initialize form data for any asset
  initFormDataForAsset(index: number): void {
    if (index < 0 || index >= this.searchResults.length) return;
    
    this.currentAssetIndex = index;
    const result = this.searchResults[index];
    
    // For processed assets, use pending asset data; for new assets, use existing asset data
    const sourceAsset = result.assetProcessed ? result.pendingAsset : result.existingAsset;
    const changeReason = result.assetProcessed ? result.savedChangeReason : '';
    
    // Update the form data for this specific asset
    result.formData = this.createFormDataFromAsset(sourceAsset, changeReason);
    
    // Update UI state
    this.isLiked = result.formData.newCondition || false;
    this.isDisliked = !result.formData.newCondition;
    
    this.cdr.detectChanges();
  }

  // Form variables
  isLiked: boolean = true;
  isDisliked: boolean = false;
  selectedStatusReason: 'Loss' | 'Obsolete' = 'Obsolete';
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
  opnameSession: OpnameSession = {} as OpnameSession;
  allUsers: User[] = []; // List of all users in the company
  allSites: SiteInfo[] = []; // List of all sites in the company
  isLoading: boolean = false; // Loading state for fetching assets
  errorMessage: string = ''; // Error message for fetching assets

  constructor(
    private apiService: ApiService,
    private opnameSessionService: OpnameSessionService,
    private cdr: ChangeDetectorRef
  ) {}

  // Check if there are any meaningful changes in the current form
  get hasFormChanges(): boolean {
    if (this.currentAssetIndex < 0) return false;
    const result = this.searchResults[this.currentAssetIndex];
    const form = result.formData;
    const existing = result.existingAsset;
    
    return form.newStatus !== existing.assetStatus ||
           form.newStatusReason !== existing.statusReason ||
           form.newCondition !== existing.condition ||
           form.newConditionNotes !== existing.conditionNotes ||
           form.newConditionPhotoURL !== existing.conditionPhotoURL ||
           form.newLocation !== existing.location ||
           form.newRoom !== existing.room ||
           form.newOwnerID !== existing.assetOwner ||
           form.newSiteID !== existing.siteID;
  }

  ngOnInit(): void {
    this.isLoading = true;
    this.checkScreenSize();
    this.updateResponsiveSettings();
    this.initOpnameData();
    this.getAllUsers();
    this.getAllSites();
    this.isLoading = false;
    this.errorMessage = '';
  }
  
  getAllUsers(): void {
    this.apiService.getAllUsers().subscribe({
      next: (userList) => {
        this.allUsers = [...userList];
      },
      error: (error) => {
        console.error('[OpnameAsset] Error fetching all users:', error);
        this.errorMessage = 'Failed to fetch user list. Please try again later.';
      }
    })
  }

  getAllSites(): void {
    this.apiService.getAllSites().subscribe({
      next: (siteList) => {
        this.allSites = [...siteList];
      },
      error: (error) => {
        console.error('[OpnameAsset] Error fetching all sites:', error);
        this.errorMessage = 'Failed to fetch site list. Please try again later.';
      }
    })
  }
  
  loadOpnameProgress(sessionID: number): void {
    this.isLoading = true;
    this.opnameSessionService.loadOpnameProgress(sessionID).subscribe({
      next: (progress: OpnameSessionProgress[]) => {
        this.populateSessionData(progress);
        console.log('[OpnameAsset] Opname session progress loaded:', progress);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('[OpnameAsset] Error loading opname session progress:', error);
        this.errorMessage = 'Failed to load opname session progress. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  populateSessionData(progress: OpnameSessionProgress[]): void {
    for (const savedRecord of progress) {
      // Get the existing asset from API
      this.apiService.getAssetByAssetTag(savedRecord.assetTag).subscribe({
        next: (asset: AssetInfo) => {
          const existingAsset = JSON.parse(JSON.stringify(asset)); // Deep copy to preserve original
          
          // Determine the owner ID and site ID to use (from saved record if available, otherwise from original asset)
          const ownerID = savedRecord.assetChanges.newOwnerID ?? asset.assetOwner;
          const siteID = savedRecord.assetChanges.newSiteID ?? asset.siteID;
          
          // Find the owner data based on the owner ID
          const owner = this.allUsers.find(user => user.userID === ownerID);
          const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : asset.assetOwnerName;
          const ownerPosition = owner ? owner.position : asset.assetOwnerPosition;
          const ownerCostCenter = owner ? owner.costCenterID : asset.assetOwnerCostCenter;
          
          // Find the site name based on the site ID
          const site = this.allSites.find(site => site.siteID === siteID);
          const siteName = site ? site.siteName : asset.siteName;
          const siteGroupName = site ? site.siteGroupName : asset.siteGroupName;
          const regionName = site ? site.regionName : asset.regionName;
          
          // Populate pending asset and apply changes from savedRecord
          const pendingAsset: AssetInfo = {
            ...JSON.parse(JSON.stringify(asset)), // Deep copy to avoid reference issues
            assetStatus: savedRecord.assetChanges.newStatus ?? asset.assetStatus,
            statusReason: savedRecord.assetChanges.newStatusReason ?? asset.statusReason,
            condition: savedRecord.assetChanges.newCondition ?? asset.condition,
            conditionNotes: savedRecord.assetChanges.newConditionNotes ?? asset.conditionNotes,
            conditionPhotoURL: savedRecord.assetChanges.newConditionPhotoURL ?? asset.conditionPhotoURL,
            location: savedRecord.assetChanges.newLocation ?? asset.location,
            room: savedRecord.assetChanges.newRoom ?? asset.room,
            assetOwner: ownerID,
            siteID: siteID,
            siteName: siteName,
            assetOwnerName: ownerName,
            assetOwnerPosition: ownerPosition,
            assetOwnerCostCenter: ownerCostCenter,
            siteGroupName: siteGroupName,
            regionName: regionName
          };

          // Check if there are any meaningful changes (excluding changeReason)
          const hasChanges = savedRecord.assetChanges.newStatus !== undefined ||
                           savedRecord.assetChanges.newStatusReason !== undefined ||
                           savedRecord.assetChanges.newCondition !== undefined ||
                           savedRecord.assetChanges.newConditionNotes !== undefined ||
                           savedRecord.assetChanges.newConditionPhotoURL !== undefined ||
                           savedRecord.assetChanges.newLocation !== undefined ||
                           savedRecord.assetChanges.newRoom !== undefined ||
                           savedRecord.assetChanges.newOwnerID !== undefined ||
                           savedRecord.assetChanges.newSiteID !== undefined;

          console.log("pending asset loaded: ", pendingAsset);
          
          // Create form data for this loaded asset based on pending asset (includes saved changes)
          const formData = this.createFormDataFromAsset(pendingAsset, savedRecord.assetChanges.changeReason || '');
          
          // Add to search results
          const newIndex = this.searchResults.length;
          this.searchResults.push({
            existingAsset: existingAsset,
            pendingAsset: pendingAsset,
            assetProcessed: true,
            processingStatus: hasChanges ? 'edited' : 'all_good',
            savedChangeReason: savedRecord.assetChanges.changeReason || '',
            formData: formData
          });

          // Set as current asset if it's the first one
          if (newIndex === 0) {
            this.currentAssetIndex = 0;
          }

          this.cdr.detectChanges(); // Trigger change detection to update the view
        },
        error: (error) => {
          console.error('[OpnameAsset] Error fetching master asset:', error);
          this.errorMessage = 'Failed to load master asset. Please try again later.';
        }
      })
    }
  }

  initOpnameData(): void {
    this.opnameSessionService.getOpnameSession(this.sessionID).subscribe({
      next: (session: OpnameSession) => {
        this.opnameSession = session;
        this.actualVariant = this.variant;
        this.actualShowLocation = this.showLocation;
        
        // Load progress and then initialize form data when done
        this.loadOpnameProgress(this.sessionID);
        console.log('[OpnameAsset] Opname session loaded:', session);
      },
      error: (error) => {
        console.error('[OpnameAsset] Error loading opname session:', error);
        this.errorMessage = 'Failed to load opname session. Please try again later.';
      }
    });
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

        // Add the found asset to the search results, using deep copies to avoid reference issues
        const newAsset = JSON.parse(JSON.stringify(asset));
        const formData = this.createFormDataFromAsset(newAsset);
        
        this.searchResults.push({
          existingAsset: newAsset,
          pendingAsset: JSON.parse(JSON.stringify(asset)), // Deep copy for modifications
          assetProcessed: false,
          processingStatus: 'pending', // Initial processing status
          savedChangeReason: '',
          formData: formData
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
      this.currentFormData.newConditionPhotoURL = 'photo_url_placeholder';
    }
  }

  setLike(): void {
    this.isLiked = true;
    this.isDisliked = false;
    this.currentFormData.newCondition = true;
  }

  setDislike(): void {
    this.isLiked = false;
    this.isDisliked = true;
    this.currentFormData.newCondition = false;
  }

  // Handle owner name input change
  onOwnerInputChange(index: number): void {
    const result = this.searchResults[index];
    const formData = result.formData;
    const input = formData.newOwnerName.trim().toLowerCase() || '';
    
    // If the input is empty, clear the owner ID to trigger validation
    if (!input) {
      formData.newOwnerID = undefined;
      return;
    }
    
    const matchedUser = this.allUsers.find(user => (
      `${user.firstName} ${user.lastName}`.toLowerCase() === input ||
      (user.email.toLowerCase() === input)
    ));

    if (matchedUser) {
      // Valid user found
      formData.newOwnerID = matchedUser.userID;
      formData.newOwnerName = `${matchedUser.firstName} ${matchedUser.lastName}`;
      formData.newSiteID = matchedUser.siteID;
      formData.newSiteName = matchedUser.siteName;

      // Create a new pendingAsset object with updated properties instead of modifying it directly
      result.pendingAsset = {
        ...JSON.parse(JSON.stringify(result.pendingAsset)), // Deep copy current pendingAsset
        assetOwnerName: formData.newOwnerName,
        assetOwner: matchedUser.userID,
        assetOwnerPosition: matchedUser.position,
        assetOwnerCostCenter: matchedUser.costCenterID,
        siteID: matchedUser.siteID,
        siteName: matchedUser.siteName,
        siteGroupName: matchedUser.siteGroupName,
        regionName: matchedUser.regionName
      };

      // Force change detection to update the view
      this.cdr.detectChanges();
    } else {
      // Invalid user - explicitly set ID to undefined to trigger validation
      console.error('[OpnameAsset] No matching user found for input:', input);
      formData.newOwnerID = undefined;
      
      // Force change detection to update validation state
      this.cdr.detectChanges();
    }
  }

  // Handle site name input change
  onSiteInputChange(index: number): void {
    const result = this.searchResults[index];
    const formData = result.formData;
    const input = formData.newSiteName.trim().toLowerCase() || '';
    const matchedSite = this.allSites.find(site => (
      site.siteName.toLowerCase() === input ||
      site.siteGroupName.toLowerCase() === input ||
      site.regionName.toLowerCase() === input
    ));

    if (!input) {
      formData.newSiteID = undefined; // Clear site ID if input is empty
      return;
    }

    if (matchedSite) {
      formData.newSiteID = matchedSite.siteID;
      formData.newSiteName = matchedSite.siteName;

      // Create a new pendingAsset object with updated site information
      result.pendingAsset = {
        ...JSON.parse(JSON.stringify(result.pendingAsset)), // Deep copy current pendingAsset
        siteID: matchedSite.siteID,
        siteName: matchedSite.siteName,
        siteGroupName: matchedSite.siteGroupName,
        regionName: matchedSite.regionName
      };

      // Force change detection to update the view
      this.cdr.detectChanges();
    } else {
      // Invalid site - explicitly set ID to undefined to trigger validation
      console.error('[OpnameAsset] No matching site found for input:', input);
      formData.newSiteID = undefined;

      // Force change detection to update validation state
      this.cdr.detectChanges();
    }
  }

  // Handle status changes
  onStatusChange(): void {
    // Reset status reason when status changes
    this.currentFormData.newStatusReason = '';
  }

  // Handle status reason changes so that it updates the formData
  onStatusReasonChange(): void {
    this.currentFormData.newStatusReason = this.selectedStatusReason;
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

    const result = this.searchResults[index];
    const formData = result.formData;

    // Validate the required input fields
    if (!formData.changeReason) {
      this.errorMessage = 'Please provide a reason for the changes.';
      this.isLoading = false;
      return;
    }

    // Check for valid owner (must have a valid ID)
    if (formData.newOwnerID === undefined) {
      this.errorMessage = 'Please select a valid user from the list.';
      this.isLoading = false;
      return;
    }

    // Check for valid site (must have a valid ID)
    if (formData.newSiteID === undefined) {
      this.errorMessage = 'Please select a valid site from the list.';
      this.isLoading = false;
      return;
    }

    // Get the asset from the search results at the specified index
    const assetChanges: AssetChange = {
      assetTag: result.existingAsset.assetTag,
      newStatus: formData.newStatus,
      newStatusReason: formData.newStatusReason,
      newCondition: formData.newCondition,
      newConditionNotes: formData.newConditionNotes,
      newConditionPhotoURL: formData.newConditionPhotoURL,
      newLocation: formData.newLocation,
      newRoom: formData.newRoom,
      newOwnerID: formData.newOwnerID,
      newSiteID: formData.newSiteID,
      changeReason: formData.changeReason,
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
        result.savedChangeReason = formData.changeReason || ''; // Save the change reason
        
        // Check if there are any changes to apply
        if (response.assetChanges && Object.keys(response.assetChanges).length > 0) {
          result.processingStatus = 'edited';
          console.log('[OpnameAsset] Changes detected, updating pending asset:', response.assetChanges);  

          // Create a new pendingAsset with deep copied properties and apply changes
          const pendingAssetCopy = JSON.parse(JSON.stringify(result.pendingAsset));
          result.pendingAsset = {
            ...pendingAssetCopy,
            ...response.assetChanges
          } as AssetInfo; // Ensure the pending asset is of type AssetInfo

        } else { // No changes to apply
          result.processingStatus = 'all_good';
          // Create a deep copy of existingAsset to avoid reference issues
          result.pendingAsset = JSON.parse(JSON.stringify(result.existingAsset));
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

    const result = this.searchResults[index];
    const formData = result.formData;
    
    const assetChanges: AssetChange = {
      assetTag: result.existingAsset.assetTag,
      newStatus: formData.newStatus,
      newStatusReason: formData.newStatusReason,
      newCondition: formData.newCondition,
      newConditionNotes: formData.newConditionNotes,
      newConditionPhotoURL: formData.newConditionPhotoURL,
      newLocation: formData.newLocation,
      newRoom: formData.newRoom,
      newOwnerID: formData.newOwnerID,
      newSiteID: formData.newSiteID,
      changeReason: "No changes. Asset verified on " + this.opnameSession?.startDate
    }

    this.isLoading = true;
    this.opnameSessionService.processScannedAsset(this.sessionID, assetChanges).subscribe({
      next: () => {
        // Deep copy the existingAsset to ensure no shared references
        result.pendingAsset = JSON.parse(JSON.stringify(result.existingAsset));
        result.assetProcessed = true;
        result.processingStatus = 'all_good';
        result.savedChangeReason = assetChanges.changeReason || '';

        // Update form data to reflect the current state
        result.formData = this.createFormDataFromAsset(result.pendingAsset, assetChanges.changeReason);
        
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
    const asset = this.searchResults[index]
    this.searchResults.splice(index, 1); // Remove the asset from the search results
    if (asset.assetProcessed) {
      // If the asset was processed, remove it from the session
      this.opnameSessionService.removeAssetFromSession(this.sessionID, asset.existingAsset.assetTag).subscribe({
        next: () => {
          console.log('[OpnameAsset] Asset removed successfully from session:', this.sessionID);
        },
        error: (error: any) => {
          console.error('[OpnameAsset] Error removing asset from session:', error);
          this.errorMessage = 'Failed to remove asset. Please try again later.';
        }
      });
    }
    this.successMessage = `Asset ${asset.existingAsset.assetTag} removed successfully.`;
  }

  // TODO: Find a way to 'save' progress in the current session
  // This could be done by periodically saving the search results to the OpnameSessionService
  // or by implementing a 'save' button that triggers a save action.
  // We can also consider auto-saving the session when processing assets.
  
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
      // Clear success message
      this.successMessage = '';

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
      const modalBackdrops = document.querySelectorAll('.modal-backdrop');
      modalBackdrops.forEach((backdrop: any) => backdrop.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
      document.body.style.overflow = '';
    }, 300)
  }
}
