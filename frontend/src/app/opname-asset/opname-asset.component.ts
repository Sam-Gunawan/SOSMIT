import { Component, HostListener, Input, ChangeDetectorRef, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
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
import { environment } from '../../environments/environments';

@Component({
  selector: 'app-opname-asset',
  imports: [CommonModule, FormsModule, AssetPageComponent],
  templateUrl: './opname-asset.component.html',
  styleUrl: './opname-asset.component.scss'
})
export class OpnameAssetComponent implements OnDestroy, OnChanges {
  public readonly serverURL = environment.serverURL; // Expose environment for use in the template

  @Input() isInReport: boolean = false; // Flag to check if in report view
  @Input() variant: 'default' | 'compact' = 'default';
  @Input() showLocation: boolean = false;
  @Input() sessionID: number = -1; // Session ID for the current opname session
  @Input() siteID: number = -1; // Site ID for the current opname session
  @Input() currentView: 'card' | 'list' = 'card';

  // Search parameters
  searchQuery: string = '';
  searchType: 'asset_tag' | 'serial_number' = 'asset_tag'; // Default search type
  isSearching: boolean = false;
  showToast: boolean = false;

  // Assets - Each search result is stored as an object in this array (it is appended to the array)
  searchResults: Array<{
    existingAsset: AssetInfo,
    pendingAsset: AssetInfo,
    assetProcessed: boolean,
    processingStatus: 'pending' | 'all_good' | 'edited',
    savedChangeReason: string,
    changeReason: string // Current editing change reason
  }> = [];

  // Currently selected asset index for form editing
  currentActiveIndex: number = -1;

  // Simplified form initialization - just set UI state based on pendingAsset
  initPendingAssetForEdit(index: number): void {
    if (index < 0 || index >= this.searchResults.length) return;
    
    this.currentActiveIndex = index;
    const result = this.searchResults[index];
    
    // Set UI state based on current pendingAsset condition
    this.isLiked = result.pendingAsset.condition === true;
    this.isDisliked = result.pendingAsset.condition === false;
    
    this.cdr.detectChanges();
  }

  // Form variables
  isLiked: boolean = true;
  isDisliked: boolean = false;
  successMessage: string = '';

  // File to upload for condition photo
  // TODO: Implement actual file upload functionality
  conditionPhoto?: File;

  // Flags for responsive design
  screenSize: 'large' | 'small' = 'large'; // Default to large screen
  isMobile: boolean = false;
  actualVariant: 'default' | 'compact' = 'default';
  actualShowLocation: boolean = true;

  // Equipment options based on seed data
  availableEquipments: string[] = [
    'Kabel power',
    'Adaptor',
    'Tas',
    'Kabel VGA',
    'Kabel USB', 
    'Simcard',
    'Handstrap',
    'Tali tas'
  ];

  // Other properties
  opnameSession: OpnameSession = {} as OpnameSession;
  allUsers: User[] = []; // List of all users in the company
  allSites: SiteInfo[] = []; // List of all sites in the company
  isLoading: boolean = false; // Loading state for fetching assets
  errorMessage: string = ''; // Error message for fetching assets
  private resizeCheckInterval?: number; // Interval for periodic size checks

  constructor(
    private apiService: ApiService,
    private opnameSessionService: OpnameSessionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.checkScreenSize();
    this.updateResponsiveSettings();
    this.getAllUsers();
    this.getAllSites();
    this.errorMessage = '';

    setTimeout(() => {
      this.isLoading = true;
      this.initOpnameData(); // Delayed initialization to ensure all inputs are set
    }, 0) // Use 0 to ensure it runs after the current call stack
    
    // Set up periodic window size checking to catch missed events
    this.resizeCheckInterval = window.setInterval(() => {
      this.checkScreenSize();
      this.updateResponsiveSettings();
    }, 1000); // Check every second
  }

  ngOnChanges(changes: SimpleChanges): void {
    // React to sessionID changes after initial setup
    if (changes['sessionID'] && !changes['sessionID'].firstChange && this.sessionID !== -1) {
      console.log('[OpnameAsset] Session ID changed from', changes['sessionID'].previousValue, 'to', changes['sessionID'].currentValue);
      this.isLoading = true;
      this.errorMessage = '';
      this.initOpnameData();
    }
  }

  ngOnDestroy(): void {
    // Clean up the interval
    if (this.resizeCheckInterval) {
      clearInterval(this.resizeCheckInterval);
    }
  }
  
  getAllUsers(): void {
    this.apiService.getAllUsers().subscribe({
      next: (userList) => {
        this.allUsers = [...userList];
      },
      error: (error) => {
        console.error('[OpnameAsset] Error fetching all users:', error);
        this.errorMessage = 'Failed to fetch user list. Please try again later.';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
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
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
      }
    })
  }
  
  loadOpnameProgress(sessionID: number): void {
    this.opnameSessionService.loadOpnameProgress(sessionID).subscribe({
      next: (progress: OpnameSessionProgress[]) => {
        this.populateSessionData(progress);
        console.log('[OpnameAsset] Opname session progress loaded:', progress);
        // Don't set isLoading = false here - let populateSessionData handle it
      },
      error: (error) => {
        console.error('[OpnameAsset] Error loading opname session progress:', error);
        this.errorMessage = 'Failed to load opname session progress. Please try again later.';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
        this.isLoading = false; // Only set false on error
      }
    });
  }

  populateSessionData(progress: OpnameSessionProgress[]): void {
    // Clear existing search results first
    this.searchResults = [];
    
    // If no progress, loading is complete
    if (progress.length === 0) {
      this.isLoading = false;
      return;
    }
    
    // Pre-allocate array with the correct length to preserve order
    const orderedResults: Array<any> = new Array(progress.length);
    let completedCount = 0;
    
    progress.forEach((savedRecord, index) => {
      // Get the existing asset from API
      this.apiService.getAssetByAssetTag(savedRecord.assetTag).subscribe({
        next: (asset: AssetInfo) => {
          const existingAsset = JSON.parse(JSON.stringify(asset)); // Deep copy to preserve original
          
          // ...existing code...
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
            equipments: savedRecord.assetChanges.newEquipments ?? asset.equipments,
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
                           savedRecord.assetChanges.newEquipments !== undefined ||
                           savedRecord.assetChanges.newOwnerID !== undefined ||
                           savedRecord.assetChanges.newSiteID !== undefined;

          console.log("pending asset loaded: ", pendingAsset);
          
          // Store in the correct position to preserve order
          orderedResults[index] = {
            existingAsset: existingAsset,
            pendingAsset: pendingAsset,
            assetProcessed: true,
            processingStatus: hasChanges ? 'edited' : 'all_good',
            savedChangeReason: savedRecord.assetChanges.changeReason || '',
            changeReason: savedRecord.assetChanges.changeReason || ''
          };

          completedCount++;
          
          // When all API calls are complete, update searchResults in the correct order
          if (completedCount === progress.length) {
            this.searchResults = orderedResults;
            
            // Set as current asset if it's the first one
            if (this.searchResults.length > 0) {
              this.currentActiveIndex = 0;
            }
            
            this.isLoading = false; // Now loading is truly complete
            this.cdr.detectChanges(); // Trigger change detection to update the view
          }
        },
        error: (error) => {
          console.error('[OpnameAsset] Error fetching master asset:', error);
          this.errorMessage = 'Failed to load master asset. Please try again later.';
          this.showToast = true;
          setTimeout(() => this.showToast = false, 3000);
          
          completedCount++;
          // Even on error, check if we've completed all calls
          if (completedCount === progress.length) {
            // Filter out any undefined entries caused by errors
            this.searchResults = orderedResults.filter(result => result !== undefined);
            this.isLoading = false; // Loading complete even with errors
            this.cdr.detectChanges();
          }
        }
      })
    });
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
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
      }
    });
  }

  @HostListener('window:resize', ['$event']) 
  onResize(event: any) {
    this.updateResponsiveSettings();
    this.checkScreenSize();
  }

  @HostListener('window:focus', ['$event'])
  onWindowFocus(event: any) {
    // Window regained focus (possibly from maximize)
    this.updateResponsiveSettings();
    this.checkScreenSize();
  }

  @HostListener('document:visibilitychange', ['$event'])
  onVisibilityChange(event: any) {
    // Document visibility changed (minimize/restore)
    if (!document.hidden) {
      // Window became visible again
      setTimeout(() => {
        this.updateResponsiveSettings();
        this.checkScreenSize();
      }, 100); // Small delay to ensure window size is updated
    }
  }

  setSearchType(type: 'asset_tag' | 'serial_number') {
    this.searchType = type;
  }  

  // Handle the search action
  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.errorMessage = 'Please type something into the search bar.';
      this.showToast = true;
      setTimeout(() => this.showToast = false, 3000);
      return;
    }

    this.searchQuery = this.searchQuery.trim().toUpperCase(); // Normalize search query
    this.isSearching = true;
    this.errorMessage = ''; // Clear previous error message
    this.showToast = true;
    setTimeout(() => this.showToast = false, 3000);

    console.log('[OpnameAsset] Starting search for:', this.searchQuery, 'by', this.searchType);

    // Check if the seached asset already exists in the search results
    const alreadyExists = this.searchResults.some(result => (
      result.existingAsset.assetTag === this.searchQuery ||
      result.existingAsset.serialNumber === this.searchQuery
    ));

    if (alreadyExists) {
      this.isSearching = false;
      this.errorMessage = 'Asset already exists in the search results. Please check the list.';
      this.showToast = true;
      setTimeout(() => this.showToast = false, 3000);
      console.log('[OpnameAsset] Asset already exists in search results:', this.searchQuery);
      return;
    }

    // Call the universal search method from API service.
    this.apiService.searchAsset(this.searchQuery, this.searchType).subscribe({
      next: (asset) => {
        console.log('[OpnameAsset] Asset found from search:', asset);

        // Add the found asset to the search results, using deep copies to avoid reference issues
        const newAsset = JSON.parse(JSON.stringify(asset));
        
        this.searchResults.unshift({
          existingAsset: newAsset,
          pendingAsset: JSON.parse(JSON.stringify(asset)), // Deep copy for modifications
          assetProcessed: false,
          processingStatus: 'pending', // Initial processing status
          savedChangeReason: '',
          changeReason: ''
        });

        this.isSearching = false;
        this.searchQuery = ''; // Clear the search input after successful search
      },
      error: (error) => {
        console.error('[OpnameAsset] Error during search:', error);
        this.isSearching = false;
        this.errorMessage = 'Asset not found. Please check the asset tag or serial number.';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
      }      
    });
  }

  // Handle file selection for condition photo
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0] && this.currentActiveIndex >= 0) {
      this.conditionPhoto = input.files[0];
      const result = this.searchResults[this.currentActiveIndex];
      
      this.apiService.uploadConditionPhoto(this.conditionPhoto, result.pendingAsset.conditionPhotoURL).subscribe({
        next: (response) => {
          console.log('[OpnameAsset] Condition photo uploaded successfully:', response);
          result.pendingAsset.conditionPhotoURL = response.url; // Use the URL returned from the API
          this.cdr.detectChanges(); // Trigger change detection to update the view

          this.successMessage = 'Photo uploaded successfully!';
          setTimeout(() => this.successMessage = '', 3000); // Clear message after 3 seconds
        },
        error: (error) => {
          console.error('[OpnameAsset] Error uploading condition photo:', error);
          this.errorMessage = 'Failed to upload condition photo. Please try again.';
          this.showToast = true;
          setTimeout(() => this.showToast = false, 3000);
        }
      })
    }
  }

  setLike(): void {
    if (this.currentActiveIndex >= 0) {
      const result = this.searchResults[this.currentActiveIndex];
      this.isLiked = true;
      this.isDisliked = false;
      result.pendingAsset.condition = true;
      this.cdr.detectChanges();
    }
  }

  setDislike(): void {
    if (this.currentActiveIndex >= 0) {
      const result = this.searchResults[this.currentActiveIndex];
      this.isLiked = false;
      this.isDisliked = true;
      result.pendingAsset.condition = false;
      this.cdr.detectChanges();
    }
  }

  // Handle owner name input change
  onOwnerInputChange(index: number): void {
    const result = this.searchResults[index];
    const input = result.pendingAsset.assetOwnerName?.trim().toLowerCase() || '';
    
    // If the input is empty, clear the owner ID to trigger validation
    if (!input) {
      result.pendingAsset.assetOwner = 0; // Use 0 to indicate invalid/unset
      result.pendingAsset.assetOwnerName = '';
      return;
    }
    
    const matchedUser = this.allUsers.find(user => (
      `${user.firstName} ${user.lastName}`.toLowerCase() === input ||
      (user.email.toLowerCase() === input)
    ));

    if (matchedUser) {
      // Valid user found - update pendingAsset directly
      result.pendingAsset = {
        ...result.pendingAsset,
        assetOwner: matchedUser.userID,
        assetOwnerName: `${matchedUser.firstName} ${matchedUser.lastName}`,
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
      // Invalid user - explicitly set ID to 0 to trigger validation
      console.error('[OpnameAsset] No matching user found for input:', input);
      result.pendingAsset.assetOwner = 0;
      
      // Force change detection to update validation state
      this.cdr.detectChanges();
    }
  }

  // Handle site name input change
  onSiteInputChange(index: number): void {
    const result = this.searchResults[index];
    const input = result.pendingAsset.siteName?.trim().toLowerCase() || '';
    
    if (!input) {
      result.pendingAsset.siteID = undefined; // Clear site ID if input is empty
      result.pendingAsset.siteName = '';
      return;
    }
    
    const matchedSite = this.allSites.find(site => (
      site.siteName.toLowerCase() === input ||
      site.siteGroupName.toLowerCase() === input ||
      site.regionName.toLowerCase() === input
    ));

    if (matchedSite) {
      // Update pendingAsset directly with matched site data
      result.pendingAsset = {
        ...result.pendingAsset,
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
      result.pendingAsset.siteID = undefined;

      // Force change detection to update validation state
      this.cdr.detectChanges();
    }
  }

  // Check if equipment is selected for a specific asset
  isEquipmentSelected(index: number, equipment: string): boolean {
    const result = this.searchResults[index];
    if (!result || !result.pendingAsset.equipments) return false;
    
    const equipmentList = result.pendingAsset.equipments.split(',').map(item => item.trim());
    return equipmentList.includes(equipment);
  }

  // Toggle equipment selection for a specific asset
  toggleEquipment(index: number, equipment: string): void {
    const result = this.searchResults[index];
    if (!result) return;

    let currentEquipments = result.pendingAsset.equipments || '';
    let equipmentList = currentEquipments ? currentEquipments.split(',').map(item => item.trim()) : [];

    const equipmentIndex = equipmentList.indexOf(equipment);
    
    if (equipmentIndex > -1) {
      // Remove equipment
      equipmentList.splice(equipmentIndex, 1);
    } else {
      // Add equipment
      equipmentList.push(equipment);
    }

    // Update the equipment string
    result.pendingAsset.equipments = equipmentList.filter(item => item).join(', ');
    
    // Force change detection
    this.cdr.detectChanges();
  }

  // Handle status changes
  onStatusChange(): void {
    if (this.currentActiveIndex >= 0) {
      const result = this.searchResults[this.currentActiveIndex];
    
      if (result.pendingAsset.assetStatus === 'Disposed') {
        result.pendingAsset.statusReason = 'Loss'; // Default to Loss for Disposed status
      } else {
        // Clear status reason if not Disposed
        result.pendingAsset.statusReason = '';
      }

      this.cdr.detectChanges();
    }
  }

  // Check if there are any meaningful changes for a specific asset
  hasFormChangesForAsset(result: any): boolean {
    if (!result) return false;
    const pending = result.pendingAsset;
    const existing = result.existingAsset;
    
    const hasChanges = pending.assetStatus !== existing.assetStatus ||
           pending.statusReason !== existing.statusReason ||
           pending.condition !== existing.condition ||
           pending.conditionNotes !== existing.conditionNotes ||
           pending.conditionPhotoURL !== existing.conditionPhotoURL ||
           pending.location !== existing.location ||
           pending.room !== existing.room ||
           pending.equipments !== existing.equipments ||
           pending.assetOwner !== existing.assetOwner ||
           pending.assetOwnerPosition !== existing.assetOwnerPosition ||
           pending.assetOwnerCostCenter !== existing.assetOwnerCostCenter ||
           pending.siteID !== existing.siteID;

    // Auto-clear change reason if no changes exist
    if (!hasChanges && result.changeReason) {
      result.changeReason = '';
    }

    return hasChanges;
  }

  // Process the asset change from the edit modal
  processAssetChange(index: number): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.showToast = true;
    setTimeout(() => this.showToast = false, 3000);

    // Validate the index to ensure it is within bounds of the search results array
    if (index < 0 || index >= this.searchResults.length) {
      console.error('[OpnameAsset] Invalid index for asset changes:', index);
      this.errorMessage = 'Invalid asset index. Please try again.';
      this.showToast = true;
      setTimeout(() => this.showToast = false, 3000);
      return;
    }

    const result = this.searchResults[index];
    const pending = result.pendingAsset;
    const existing = result.existingAsset;

    // Validate the required input fields
    // Check if any change has been made
    if (!this.hasFormChangesForAsset(result)) {
      this.errorMessage = 'No changes made to the asset. Please modify at least one field.';
      this.showToast = true;
      setTimeout(() => this.showToast = false, 3000);
      return;
    }

    // Check for change reason (required for any changes made)
    if (!result.changeReason) {
      this.errorMessage = 'Please provide a reason for the changes.';
      this.showToast = true;
      setTimeout(() => this.showToast = false, 3000);
      this.isLoading = false;
      return;
    }

    // Check for valid owner (must have a valid ID)
    if (pending.assetOwner === undefined || pending.assetOwner === 0) {
      this.errorMessage = 'Please select a valid user from the list.';
      this.showToast = true;
      setTimeout(() => this.showToast = false, 3000);
      this.isLoading = false;
      return;
    }

    // Check for valid site (must have a valid ID)
    if (pending.siteID === undefined) {
      this.errorMessage = 'Please select a valid site from the list.';
      this.showToast = true;
      setTimeout(() => this.showToast = false, 3000);
      this.isLoading = false;
      return;
    }

    this.isLoading = true;

    // Build assetChanges object only with actual changes
    const assetChanges: AssetChange = {} as AssetChange;
    
    if (pending.assetStatus !== existing.assetStatus) {
      assetChanges.newStatus = pending.assetStatus;
    }
    if (pending.statusReason !== existing.statusReason) {
      assetChanges.newStatusReason = pending.statusReason;
    }
    if (pending.condition !== existing.condition) {
      assetChanges.newCondition = pending.condition;
    }
    if (pending.conditionNotes !== existing.conditionNotes) {
      assetChanges.newConditionNotes = pending.conditionNotes;
    }
    if (pending.conditionPhotoURL !== existing.conditionPhotoURL) {
      assetChanges.newConditionPhotoURL = pending.conditionPhotoURL;
    }
    if (pending.location !== existing.location) {
      assetChanges.newLocation = pending.location;
    }
    if (pending.room !== existing.room) {
      assetChanges.newRoom = pending.room;
    }
    if (pending.equipments !== existing.equipments) {
      assetChanges.newEquipments = pending.equipments;
    }
    if (pending.assetOwner !== existing.assetOwner) {
      assetChanges.newOwnerID = pending.assetOwner;
    }
    if (pending.assetOwnerPosition !== existing.assetOwnerPosition) {
      assetChanges.newOwnerPosition = pending.assetOwnerPosition;
    }
    if (pending.assetOwnerCostCenter !== existing.assetOwnerCostCenter) {
      assetChanges.newOwnerCostCenter = pending.assetOwnerCostCenter;
    }
    if (pending.siteID !== existing.siteID) {
      assetChanges.newSiteID = pending.siteID;
    }

    // Add required fields
    assetChanges.assetTag = existing.assetTag;
    assetChanges.changeReason = result.changeReason || '';
    
    console.log('[OpnameAsset] Processing asset change: ', assetChanges);

    // Set loading state while processing
    this.isSearching = true; 
    this.isLoading = true;

    console.log('[OpnameAsset] Processing new asset change:', assetChanges);
    this.opnameSessionService.processScannedAsset(this.sessionID, assetChanges).subscribe({
      next: (response) => {
        console.log('[OpnameAsset] Asset processed successfully:', response);
        result.assetProcessed = true; // Mark the asset as processed
        result.savedChangeReason = result.changeReason || ''; // Save the change reason
        
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
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
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
    const existing = result.existingAsset;
    
    const assetChanges: AssetChange = {
      assetTag: existing.assetTag,
      newStatus: existing.assetStatus,
      newStatusReason: existing.statusReason,
      newCondition: existing.condition,
      newConditionNotes: existing.conditionNotes,
      newConditionPhotoURL: existing.conditionPhotoURL,
      newLocation: existing.location,
      newRoom: existing.room,
      newEquipments: existing.equipments,
      newOwnerID: existing.assetOwner,
      newOwnerPosition: existing.assetOwnerPosition,
      newOwnerCostCenter: existing.assetOwnerCostCenter,
      newSiteID: existing.siteID,
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
        result.changeReason = ''; // Clear current editing change reason
        
        this.isLoading = false;
        this.successMessage = 'Asset marked as all good. No changes.';
      },
      error: (error) => {
        this.errorMessage = 'Failed to mark asset as verified: ' + (error.message || 'Unkown error');
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
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
      this.showToast = true;
      setTimeout(() => this.showToast = false, 3000);
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
          this.showToast = true;
          setTimeout(() => this.showToast = false, 3000);
        }
      });
    }
    this.successMessage = `Asset ${asset.existingAsset.assetTag} removed successfully.`;
  }

  @HostListener('input', ['$event'])
  onInput(event?: Event) {
    // Force change detection to update form validation and visibility
    this.cdr.detectChanges();
    
    // If this is an input from a form field, check if we need to auto-clear change reasons
    if (event?.target && this.searchResults.length > 0) {
      // Find the result that corresponds to this input and check for changes
      this.searchResults.forEach(result => {
        this.hasFormChangesForAsset(result); // This will auto-clear changeReason if no changes
      });
    }
  }


  private checkScreenSize() {
    const newIsMobile = window.innerWidth < 768; // Define mobile breakpoint
    const newScreenSize = newIsMobile ? 'small' : 'large';
    let newCurrentView = this.currentView;
    if (!this.isInReport) {
      newCurrentView = newIsMobile ? 'list' : 'card'; // Default to list view on mobile
    }
    
    // Only update if values have changed and NOT in report page
    if (this.isMobile !== newIsMobile || this.screenSize !== newScreenSize || this.currentView !== newCurrentView) {
      this.isMobile = newIsMobile;
      this.screenSize = newScreenSize;

      if (!this.isInReport) {
        this.currentView = newCurrentView
      }

      this.cdr.detectChanges(); // Only trigger change detection when needed
    }
  }

  toggleView(view: 'card' | 'list') {
    if (!this.isMobile) { // Only allow toggle on desktop view
      this.currentView = view;
    }
  }

  private updateResponsiveSettings() {
    const newActualVariant = window.innerWidth >= 1000 ? this.variant : 'default';
    const newActualShowLocation = window.innerWidth >= 1000 ? this.showLocation : false;
    
    // Only update if values have changed
    if (this.actualVariant !== newActualVariant || this.actualShowLocation !== newActualShowLocation) {
      this.actualVariant = newActualVariant;
      this.actualShowLocation = newActualShowLocation;
      this.cdr.detectChanges(); // Only trigger change detection when needed
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
