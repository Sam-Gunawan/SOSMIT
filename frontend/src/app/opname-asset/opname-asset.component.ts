import { Component, HostListener, Input, ChangeDetectorRef, OnDestroy, OnChanges, SimpleChanges, AfterViewInit, ViewChild } from '@angular/core';
import { ApiService } from '../services/api.service';
import { OpnameSessionService } from '../services/opname-session.service';
import { AssetInfo } from '../model/asset-info.model';
import { AssetChange } from '../model/asset-changes.model';
import { OpnameSession } from '../model/opname-session.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../model/user.model';
import { SiteInfo } from '../model/site-info.model';
import { OpnameSessionProgress } from '../model/opname-session-progress.model';
import { environment } from '../../environments/environments';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { AssetPageComponent } from '../asset-page/asset-page.component';

export interface AssetTableData {
  assetTag: string;
  assetName: string;
  serialNumber: string;
  ownerName: string;
  costCenter: number;
  condition: boolean | null;
  status: string;
  isProcessed: boolean;
  index: number; // To track the original search results index
}

@Component({
  selector: 'app-opname-asset',
  imports: [CommonModule, FormsModule, MatTableModule, MatSortModule, MatPaginatorModule, AssetPageComponent],
  templateUrl: './opname-asset.component.html',
  styleUrl: './opname-asset.component.scss'
})
export class OpnameAssetComponent implements OnDestroy, OnChanges, AfterViewInit {
  public readonly serverURL = environment.serverURL; // Expose environment for use in the template

  private allColumns: string[] = ['assetTag', 'assetName', 'serialNumber', 'ownerName', 'costCenter', 'condition', 'status', 'actions'];
  dataSource = new MatTableDataSource<AssetTableData>([]);

  // Getter to return displayed columns based on report mode
  get displayedColumns(): string[] {
    if (this.isInReport) {
      // Remove 'actions' column when in report view
      return this.allColumns.filter(col => col !== 'actions');
    }
    return this.allColumns;
  }

  @Input() isInReport: boolean = false; // Flag to check if in report view
  @Input() variant: 'default' | 'compact' = 'default';
  @Input() showLocation: boolean = false;
  @Input() sessionID: number = -1; // Session ID for the current opname session
  @Input() siteID: number = -1; // Site ID for the current opname session
  @Input() currentView: 'card' | 'list' = 'card';
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Search parameters
  searchQuery: string = '';
  assetTagQuery: string = '';
  serialNumberQuery: string = '';
  activeInputField: 'assetTag' | 'serialNumber' | null = null;
  searchType: 'asset_tag' | 'serial_number' = 'asset_tag'; // Default search type
  isSearching: boolean = false;
  showToast: boolean = false;
  showSearchForm: boolean = false; // Track if search form is visible on mobile
  showFilterForm: boolean = false; // Track if filter form is visible on mobile

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

  // Form variables
  isLiked: boolean = true;
  isDisliked: boolean = false;
  successMessage: string = '';

  // File to upload for condition photo
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

  // Filter properties
  filterText: string = '';
  filterCondition: string = '';
  filterStatus: string = '';
  
  // Available filter options
  readonly conditionOptions = [
    { value: '', label: 'All Conditions' },
    { value: 'good', label: 'Good' },
    { value: 'bad', label: 'Bad' },
    { value: 'unknown', label: 'Unknown' }
  ];
  
  readonly statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'Deployed', label: 'Deployed' },
    { value: 'On Loan', label: 'On Loan' },
    { value: 'In Inventory', label: 'In Inventory' },
    { value: 'In Repair', label: 'In Repair' },
    { value: 'Down', label: 'Down' },
    { value: 'Disposed', label: 'Disposed' }
  ];

  constructor(
    private apiService: ApiService,
    private opnameSessionService: OpnameSessionService,
    private cdr: ChangeDetectorRef
  ) {
    // Explicitly initialize search fields to ensure they're empty
    this.assetTagQuery = '';
    this.serialNumberQuery = '';
    this.searchQuery = '';
    this.activeInputField = null;
  }

  ngAfterViewInit() {
    // The table might not exist yet if searchResults is empty
    // Connection will happen in updateTableDataSource when data is loaded
    this.connectTableComponents();
  }

  private connectTableComponents(): void {
    // Only try to connect if the table exists (searchResults.length > 0)
    if (this.searchResults.length === 0) {
      console.log('[OpnameAsset] Table not rendered yet, will connect when data is loaded');
      return;
    }

    if (this.sort) {
      this.dataSource.sort = this.sort;
      console.log('[OpnameAsset] Sort connected successfully');
    } else {
      console.error('[OpnameAsset] MatSort not found!');
    }

    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      console.log('[OpnameAsset] Paginator connected successfully');
    } else {
      console.error('[OpnameAsset] MatPaginator not found!');
    }
  }

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
        this.connectTableComponents();
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
          const ownerSiteID = savedRecord.assetChanges.newOwnerSiteID ?? asset.assetOwnerSiteID;
          const siteID = savedRecord.assetChanges.newSiteID ?? asset.siteID;
          
          // Debug logging
          console.log('[OpnameAsset] Asset Changes for', savedRecord.assetTag, ':', savedRecord.assetChanges);
          console.log('[OpnameAsset] Original asset data:', asset);
          
          // Find the owner data based on the owner ID
          const owner = this.allUsers.find(user => user.userID === ownerID);
          const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : asset.assetOwnerName;
          
          // Use saved position/cost center if available, otherwise fall back to owner data or original asset data
          const ownerPosition = savedRecord.assetChanges.newOwnerPosition ?? 
                               (owner ? owner.position : asset.assetOwnerPosition);
          const ownerCostCenter = savedRecord.assetChanges.newOwnerCostCenter ?? 
                                 (owner ? owner.costCenterID : asset.assetOwnerCostCenter);
                                 
          console.log('[OpnameAsset] Calculated ownerPosition:', ownerPosition, 'from saved:', savedRecord.assetChanges.newOwnerPosition, 'owner:', owner?.position, 'original:', asset.assetOwnerPosition);
          console.log('[OpnameAsset] Calculated ownerCostCenter:', ownerCostCenter, 'from saved:', savedRecord.assetChanges.newOwnerCostCenter, 'owner:', owner?.costCenterID, 'original:', asset.assetOwnerCostCenter);
          
          // Find the owner site data based on the owner site ID
          const ownerSite = this.allSites.find(site => site.siteID === ownerSiteID);
          const ownerSiteName = ownerSite ? ownerSite.siteName : asset.assetOwnerSiteName;
          
          // Find the asset site name based on the asset site ID
          const site = this.allSites.find(site => site.siteID === siteID);
          const siteName = site ? site.siteName : asset.siteName;
          const siteGroupName = site ? site.siteGroup : asset.siteGroupName;
          const regionName = site ? site.siteRegion : asset.regionName;
          
          // Populate pending asset and apply changes from savedRecord
          const pendingAsset: AssetInfo = {
            ...JSON.parse(JSON.stringify(asset)), // Deep copy to avoid reference issues
            serialNumber: savedRecord.assetChanges.newSerialNumber ?? asset.serialNumber,
            assetStatus: savedRecord.assetChanges.newStatus ?? asset.assetStatus,
            statusReason: savedRecord.assetChanges.newStatusReason ?? asset.statusReason,
            condition: savedRecord.assetChanges.newCondition ?? asset.condition,
            conditionNotes: savedRecord.assetChanges.newConditionNotes ?? asset.conditionNotes,
            conditionPhotoURL: savedRecord.assetChanges.newConditionPhotoURL ?? asset.conditionPhotoURL,
            location: savedRecord.assetChanges.newLocation ?? asset.location,
            room: savedRecord.assetChanges.newRoom ?? asset.room,
            equipments: savedRecord.assetChanges.newEquipments ?? asset.equipments,
            assetOwner: ownerID,
            assetOwnerName: ownerName,
            assetOwnerPosition: ownerPosition,
            assetOwnerCostCenter: ownerCostCenter,
            assetOwnerSiteID: ownerSiteID,
            assetOwnerSiteName: ownerSiteName,
            siteID: siteID,
            siteName: siteName,
            siteGroupName: siteGroupName,
            regionName: regionName
          };

          console.log('[OpnameAsset] Final pendingAsset:', pendingAsset);
          console.log('[OpnameAsset] Position in final asset:', pendingAsset.assetOwnerPosition);
          console.log('[OpnameAsset] Cost Center in final asset:', pendingAsset.assetOwnerCostCenter);

          // Check if there are any meaningful changes (excluding changeReason)
          const hasChanges = savedRecord.assetChanges.newSerialNumber !== undefined ||
                           savedRecord.assetChanges.newStatus !== undefined ||
                           savedRecord.assetChanges.newStatusReason !== undefined ||
                           savedRecord.assetChanges.newCondition !== undefined ||
                           savedRecord.assetChanges.newConditionNotes !== undefined ||
                           savedRecord.assetChanges.newConditionPhotoURL !== undefined ||
                           savedRecord.assetChanges.newLocation !== undefined ||
                           savedRecord.assetChanges.newRoom !== undefined ||
                           savedRecord.assetChanges.newEquipments !== undefined ||
                           savedRecord.assetChanges.newOwnerID !== undefined ||
                           savedRecord.assetChanges.newOwnerPosition !== undefined ||
                           savedRecord.assetChanges.newOwnerCostCenter !== undefined ||
                           savedRecord.assetChanges.newOwnerSiteID !== undefined ||
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
            this.updateTableDataSource(); // Update table with loaded data
            
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
            this.updateTableDataSource(); // Update table even after errors
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

  // Getter methods for disabled states
  get isAssetTagDisabled(): boolean {
    return !!(this.serialNumberQuery && this.serialNumberQuery.trim().length > 0);
  }

  get isSerialNumberDisabled(): boolean {
    return !!(this.assetTagQuery && this.assetTagQuery.trim().length > 0);
  }

  // Update table data when search results are modified
  updateTableDataSource(): void {
    const tableData: AssetTableData[] = this.searchResults.map((result, index) => ({
      assetTag: result.pendingAsset.assetTag,
      assetName: result.pendingAsset.assetName,
      serialNumber: result.pendingAsset.serialNumber || 'N/A',
      ownerName: result.pendingAsset.assetOwnerName,
      costCenter: result.pendingAsset.assetOwnerCostCenter,
      condition: result.pendingAsset.condition,
      status: result.pendingAsset.assetStatus,
      isProcessed: result.assetProcessed,
      index: index
    }));

    this.dataSource.data = tableData;
    
    // On mobile, automatically show filter form when search results are available
    if (this.isMobile && this.searchResults.length > 0) {
      this.showFilterForm = true;
    }
    
    // Connect paginator and sort after data is set and DOM is updated
    setTimeout(() => {
      if (this.paginator && !this.dataSource.paginator) {
        this.dataSource.paginator = this.paginator;
        console.log('[OpnameAsset] Paginator connected after data update');
      }
      if (this.sort && !this.dataSource.sort) {
        this.dataSource.sort = this.sort;
        console.log('[OpnameAsset] Sort connected after data update');
      }
    }, 0);
    
    console.log('[OpnameAsset] Table data updated:', tableData);
    
    // Apply current filters
    this.applyFilters();

    this.cdr.detectChanges();
  }

  // Apply filters to the table data
  applyFilters(): void {
    if (!this.dataSource) return;
    
    this.dataSource.filterPredicate = (data: AssetTableData, filter: string) => {
      const filters = JSON.parse(filter);
      
      // Text filter - search across multiple fields
      const textMatch = !filters.text || 
        data.assetTag.toLowerCase().includes(filters.text) ||
        data.assetName.toLowerCase().includes(filters.text) ||
        data.serialNumber.toLowerCase().includes(filters.text) ||
        data.ownerName.toLowerCase().includes(filters.text) ||
        data.costCenter.toString().includes(filters.text);
      
      // Condition filter
      let conditionMatch = true;
      if (filters.condition) {
        const conditionValue = data.condition === true ? 'good' : 
                              data.condition === false ? 'bad' : 'unknown';
        conditionMatch = conditionValue === filters.condition;
      }
      
      // Status filter
      const statusMatch = !filters.status || data.status === filters.status;
      
      return textMatch && conditionMatch && statusMatch;
    };
    
    // Create filter object
    const filterObject = {
      text: this.filterText.toLowerCase(),
      condition: this.filterCondition,
      status: this.filterStatus
    };
    
    this.dataSource.filter = JSON.stringify(filterObject);
    
    // Reconnect table components after filtering
    setTimeout(() => {
      this.connectTableComponents();
    }, 0);
  }

  // Filter methods
  onFilterTextChange(): void {
    this.applyFilters();
  }

  onFilterConditionChange(): void {
    this.applyFilters();
  }

  onFilterStatusChange(): void {
    this.applyFilters();
  }

  // Reset all filters
  resetFilters(): void {
    this.filterText = '';
    this.filterCondition = '';
    this.filterStatus = '';
    this.applyFilters();
  }

  // Check if any filters are active
  get hasActiveFilters(): boolean {
    return !!(this.filterText || this.filterCondition || this.filterStatus);
  }

  onRowClick(row: AssetTableData): void {
    console.log('[OpnameAsset] Row clicked:', row);
    this.initPendingAssetForEdit(row.index);
    
    // Trigger modal opening using pendingAsset assetTag
    const result = this.searchResults[row.index];
    const modalId = this.isInReport ? `pending-modal-${result.pendingAsset.assetTag}` : `edit-modal-${result.pendingAsset.assetTag}`;
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // Handle the search action
  onSearch(): void {
    // Determine which input field has data and set the search query
    let searchValue = '';
    if (this.assetTagQuery && this.assetTagQuery.trim().length > 0) {
      searchValue = this.assetTagQuery.trim();
      this.searchType = 'asset_tag';
    } else if (this.serialNumberQuery && this.serialNumberQuery.trim().length > 0) {
      searchValue = this.serialNumberQuery.trim();
      this.searchType = 'serial_number';
    }

    if (!searchValue) {
      this.errorMessage = 'Please enter either an asset tag or serial number to search.';
      this.showToast = true;
      setTimeout(() => this.showToast = false, 3000);
      return;
    }

    this.searchQuery = searchValue.toUpperCase(); // Normalize search query
    this.isSearching = true;
    this.errorMessage = ''; // Clear previous error message

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
        const pendingAsset = JSON.parse(JSON.stringify(asset)); // Deep copy for modifications
        
        // Ensure owner site information is properly set
        // If no owner site info exists, default to the asset's current site
        if (!pendingAsset.assetOwnerSiteID) {
          pendingAsset.assetOwnerSiteID = pendingAsset.siteID;
        }
        if (!pendingAsset.assetOwnerSiteName) {
          pendingAsset.assetOwnerSiteName = pendingAsset.siteName;
        }
        
        this.searchResults.unshift({
          existingAsset: newAsset,
          pendingAsset: pendingAsset,
          assetProcessed: false,
          processingStatus: 'pending', // Initial processing status
          savedChangeReason: '',
          changeReason: ''
        });

        this.updateTableDataSource(); // Update table with new search result
        this.isSearching = false;
        // Clear the appropriate input field after successful search
        if (this.searchType === 'asset_tag') {
          this.assetTagQuery = '';
        } else {
          this.serialNumberQuery = '';
        }
        this.searchQuery = '';
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
        assetOwnerSiteID: matchedUser.siteID,
        assetOwnerSiteName: matchedUser.siteName,
        assetOwnerSiteGroupName: matchedUser.siteGroupName,
        assetOwnerRegionName: matchedUser.regionName
        // Note: Asset location (siteID, siteName, siteGroupName, regionName) remains unchanged
        // when changing owner - only owner location changes
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

  // Handle owner site name input change
  onOwnerSiteInputChange(index: number): void {
    const result = this.searchResults[index];
    const input = result.pendingAsset.assetOwnerSiteName?.trim().toLowerCase() || '';
    
    if (!input) {
      result.pendingAsset.assetOwnerSiteID = undefined; // Clear owner site ID if input is empty
      result.pendingAsset.assetOwnerSiteName = '';
      return;
    }
    
    const matchedSite = this.allSites.find(site => (
      site.siteName.toLowerCase() === input ||
      site.siteGroup.toLowerCase() === input ||
      site.siteRegion.toLowerCase() === input
    ));

    if (matchedSite) {
      // Update pendingAsset directly with matched owner site data
      result.pendingAsset = {
        ...result.pendingAsset,
        assetOwnerSiteID: matchedSite.siteID,
        assetOwnerSiteName: matchedSite.siteName,
        assetOwnerSiteGroupName: matchedSite.siteGroup,
        assetOwnerRegionName: matchedSite.siteRegion
      };

      // Force change detection to update the view
      this.cdr.detectChanges();
    } else {
      // Invalid site - explicitly set ID to undefined to trigger validation
      console.error('[OpnameAsset] No matching site found for owner site input:', input);
      result.pendingAsset.assetOwnerSiteID = undefined;
      
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
      site.siteGroup.toLowerCase() === input ||
      site.siteRegion.toLowerCase() === input
    ));

    if (matchedSite) {
      // Update pendingAsset directly with matched site data
      result.pendingAsset = {
        ...result.pendingAsset,
        siteID: matchedSite.siteID,
        siteName: matchedSite.siteName,
        siteGroupName: matchedSite.siteGroup,
        regionName: matchedSite.siteRegion
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
           pending.serialNumber !== existing.serialNumber ||
           pending.statusReason !== existing.statusReason ||
           pending.serialNumber !== existing.serialNumber ||
           pending.condition !== existing.condition ||
           pending.conditionNotes !== existing.conditionNotes ||
           pending.conditionPhotoURL !== existing.conditionPhotoURL ||
           pending.location !== existing.location ||
           pending.room !== existing.room ||
           pending.equipments !== existing.equipments ||
           pending.assetOwner !== existing.assetOwner ||
           pending.assetOwnerPosition !== existing.assetOwnerPosition ||
           pending.assetOwnerCostCenter !== existing.assetOwnerCostCenter ||
           pending.assetOwnerSiteID !== existing.assetOwnerSiteID ||
           pending.siteID !== existing.siteID;

    // Auto-clear change reason if no changes exist
    if (!hasChanges && result.changeReason) {
      result.changeReason = '';
    }

    return hasChanges;
  }

  get invalidForms(): number {
    return document.getElementsByClassName('is-invalid').length;
  }

  // Get reason why save button is disabled for user feedback
  getSaveDisabledReason(result: any): string {
    if (!this.hasFormChangesForAsset(result)) {
      return 'Tidak ada perubahan terdeteksi. Silakan lakukan perubahan jika ada.';
    }
    
    if (this.invalidForms > 0) {
      if (this.invalidForms === 1 && (!result.changeReason || result.changeReason === '')) {
        return 'Alasan perubahan wajib diisi. Mohon jelaskan alasan Anda melakukan perubahan ini.';
      }
      return 'Mohon perbaiki kesalahan pengisian sebelum menyimpan.';
    }
    
    return 'Perubahan tidak dapat disimpan.';
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
    
    if (pending.serialNumber !== existing.serialNumber) {
      assetChanges.newSerialNumber = pending.serialNumber;
    }
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
    if (pending.assetOwnerSiteID !== existing.assetOwnerSiteID) {
      assetChanges.newOwnerSiteID = pending.assetOwnerSiteID;
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
          
          // Ensure owner site information is properly set
          if (!result.pendingAsset.assetOwnerSiteID) {
            result.pendingAsset.assetOwnerSiteID = result.pendingAsset.siteID;
          }
          if (!result.pendingAsset.assetOwnerSiteName) {
            result.pendingAsset.assetOwnerSiteName = result.pendingAsset.siteName;
          }
        }

        console.log('[OpnameAsset] Updated asset:', result.pendingAsset);

        // Update table data source after processing is complete
        this.updateTableDataSource();
        this.cdr.detectChanges();

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
    
    this.closeBootstrapModal(`edit-modal-${result.existingAsset.assetTag}`);
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
      newSerialNumber: existing.serialNumber,
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
      newOwnerSiteID: existing.assetOwnerSiteID,
      newSiteID: existing.siteID,
      changeReason: "No changes. Asset verified on " + this.opnameSession?.startDate
    }

    this.isLoading = true;
    this.opnameSessionService.processScannedAsset(this.sessionID, assetChanges).subscribe({
      next: () => {
        // Deep copy the existingAsset to ensure no shared references
        result.pendingAsset = JSON.parse(JSON.stringify(result.existingAsset));
        
        // Ensure owner site information is properly set
        if (!result.pendingAsset.assetOwnerSiteID) {
          result.pendingAsset.assetOwnerSiteID = result.pendingAsset.siteID;
        }
        if (!result.pendingAsset.assetOwnerSiteName) {
          result.pendingAsset.assetOwnerSiteName = result.pendingAsset.siteName;
        }
        
        result.assetProcessed = true;
        result.processingStatus = 'all_good';
        result.savedChangeReason = assetChanges.changeReason || '';
        result.changeReason = ''; // Clear current editing change reason
        
        // Update table data source after processing is complete
        this.updateTableDataSource();
        this.cdr.detectChanges();
        
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

    this.closeBootstrapModal(`assetAllGood-${index}`);
  }

  // Remove a specific asset from the search results
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
    this.updateTableDataSource(); // Update the table after removal
    
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

  toggleSearchForm(): void {
    this.showSearchForm = !this.showSearchForm;
  }

  toggleFilterForm(): void {
    this.showFilterForm = !this.showFilterForm;
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
    const previousIsMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768;
    
    // Handle form visibility based on screen size
    if (!this.isMobile) {
      // On desktop, always show both forms
      this.showSearchForm = true;
      this.showFilterForm = true;
    } else {
      // On mobile, manage form visibility intelligently
      if (!previousIsMobile) { // Just switched to mobile
        this.showSearchForm = false;
        this.showFilterForm = this.searchResults.length > 0;
      }
    }
    
    const newActualVariant = window.innerWidth >= 1000 ? this.variant : 'default';
    const newActualShowLocation = window.innerWidth >= 1000 ? this.showLocation : false;
    
    // Only update if values have changed
    if (this.actualVariant !== newActualVariant || this.actualShowLocation !== newActualShowLocation) {
      this.actualVariant = newActualVariant;
      this.actualShowLocation = newActualShowLocation;
      this.cdr.detectChanges(); // Only trigger change detection when needed
    }
  }

  private closeBootstrapModal(modalId: string): void {
    setTimeout(() => {
      // Clear success message
      this.successMessage = '';

      // Use vanilla JS to close the Bootstrap modal
      const modalElement = document.getElementById(modalId);
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
