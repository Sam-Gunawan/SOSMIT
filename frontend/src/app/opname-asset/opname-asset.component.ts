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
import { parseAdaptorSN } from '../reusable_functions';
import { SubSite } from '../model/sub-site.model';
import { OpnamePreviewComponent } from '../opname-preview/opname-preview.component';

export interface AssetTableData {
  assetTag: string;
  assetName: string;
  serialNumber: string;
  ownerName: string;
  costCenter: number;
  condition: boolean | null;
  status: string;
  processingStatus: 'pending' | 'all_good' | 'edited';
  isProcessed: boolean;
  index: number; // To track the original search results index
}

@Component({
  selector: 'app-opname-asset',
  imports: [CommonModule, FormsModule, MatTableModule, MatSortModule, MatPaginatorModule, AssetPageComponent, OpnamePreviewComponent],
  templateUrl: './opname-asset.component.html',
  styleUrl: './opname-asset.component.scss'
})
export class OpnameAssetComponent implements OnDestroy, OnChanges, AfterViewInit {
  public readonly serverURL = environment.serverURL; // Expose environment for use in the template

  private allColumns: string[] = ['assetTag', 'assetName', 'serialNumber', 'ownerName', 'costCenter', 'condition', 'status', 'processingStatus', 'actions'];
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
  showPreview: boolean = false; // Track if preview is visible

  // Assets - Each search result is stored as an object in this array (it is appended to the array)
  searchResults: Array<{
    existingAsset: AssetInfo,
    pendingAsset: AssetInfo,
    availableEquipments: string[], // List of equipments for the current asset product variety
    adaptorSN: string | null,
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

  // Other properties
  opnameSession: OpnameSession = {} as OpnameSession;
  allUsers: User[] = []; // List of all users in the company
  allSites: SiteInfo[] = []; // List of all sites in the company
  allSubSites: SubSite[] = []; // List of all sub-sites for a given site
  isLoading: boolean = false; // Loading state for fetching assets
  errorMessage: string = ''; // Error message for fetching assets
  private resizeCheckInterval?: number; // Interval for periodic size checks

  // Filter properties
  filterText: string = '';
  filterCondition: string = '';
  filterStatus: string = '';
  filterProcessingStatus: string = '';
  
  // Available filter options
  readonly conditionOptions = [
    { value: '', label: 'All Conditions' },
    { value: 'good', label: 'Good' },
    { value: 'bad', label: 'Bad' }
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

  readonly processingStatusOptions = [
    { value: '', label: 'All Process' },
    { value: 'pending', label: 'Pending' },
    { value: 'edited', label: 'Diperbarui' },
    { value: 'all_good', label: 'Sesuai' }
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
    this.getAllSubSites();
    localStorage.setItem('pendingCount', '0'); // Initialize pending assets count to 0
    localStorage.setItem('assetCount', '0'); // Initialize scanned assets count to 0
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

  getAllSubSites(): void {
    this.apiService.getAllSubSites().subscribe({
      next: (subSites: SubSite[]) => {
        this.allSubSites = [...subSites];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[OpnameAsset] Error fetching sub-sites:', error);
        this.errorMessage = 'Failed to fetch sub-sites.';
      }
    });
  }

  private getAvailableEquipments(result: any): void {
    this.apiService.getAssetEquipments(result.pendingAsset.productVariety).subscribe({
      next: (equipmentsString: string) => {
        // Parse the comma-separated string into an array
        if (equipmentsString && typeof equipmentsString === 'string' && equipmentsString.trim() !== '') {
          result.availableEquipments = equipmentsString.split(',').map((e: string) => e.trim()).filter((e: string) => e !== '');
        } else {
          result.availableEquipments = []; // No equipments available for this product variety
        }
        
        this.cdr.detectChanges(); // Trigger change detection to update the UI
      },
      error: (error) => {
        result.availableEquipments = []; // Fallback to empty array on error
        this.cdr.detectChanges();
      }
    });
  }

  loadOpnameProgress(sessionID: number): void {
    this.opnameSessionService.loadOpnameProgress(sessionID).subscribe({
      next: (progress: OpnameSessionProgress[]) => {
        this.populateSessionData(progress);
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

    // Save the amount of assets in progress to local storage
    this.incrementAssetScanned(progress.length);
    
    // Pre-allocate array with the correct length to preserve order
    const orderedResults: Array<any> = new Array(progress.length);
    let completedCount = 0;
    
    progress.forEach((savedRecord, index) => {
      // Get the existing asset from API
      this.apiService.getAssetByAssetTag(savedRecord.assetTag).subscribe({
        next: (asset: AssetInfo) => {
          const existingAsset = JSON.parse(JSON.stringify(asset)); // Deep copy to preserve original

          // Count the pending assets
          if (savedRecord.processingStatus === 'pending') {
            this.incrementPendingCount(1);
          }
          
          // Extract data from saved changes or fall back to original asset
          const ownerID = savedRecord.assetChanges.newOwnerID ?? asset.assetOwner;
          const subSiteID = savedRecord.assetChanges.newSubSiteID ?? asset.subSiteID;
          const ownerDepartment = savedRecord.assetChanges.newOwnerDepartment ?? asset.assetOwnerDepartment;
          const ownerDivision = savedRecord.assetChanges.newOwnerDivision ?? asset.assetOwnerDivision;
          
          // Find the owner data based on the owner ID
          const owner = this.allUsers.find(user => user.userID === ownerID);
          const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : asset.assetOwnerName;
          
          // Owner's site: Use saved owner site ID, or derive from owner's data, or fall back to asset's original owner site
          const ownerSiteID = savedRecord.assetChanges.newOwnerSiteID ?? 
                             (owner ? owner.siteID : asset.siteID);
          const ownerSite = this.allSites.find(site => site.siteID === ownerSiteID);
          const ownerSiteName = ownerSite ? ownerSite.siteName : asset.siteName;
          
          // Use saved position/cost center if available, otherwise fall back to owner data or original asset data
          const ownerPosition = savedRecord.assetChanges.newOwnerPosition ?? 
                               (owner ? owner.position : asset.assetOwnerPosition);
          const ownerCostCenter = savedRecord.assetChanges.newOwnerCostCenter ?? 
                                 (owner ? owner.costCenterID : asset.assetOwnerCostCenter);

          // Asset location: Find the sub-site data based on the sub site ID (this is the asset's physical location)
          const subSite = this.allSubSites.find(subSite => subSite.subSiteID === subSiteID);
          const subSiteName = subSite ? subSite.subSiteName : asset.subSiteName;
          
          // Asset's site group and region: Derived from the sub-site's parent site (asset location, not owner location)
          const assetLocationSite = this.allSites.find(site => site.siteID === subSite?.siteID);
          const siteGroupName = assetLocationSite ? assetLocationSite.siteGroup : asset.siteGroupName;
          const regionName = assetLocationSite ? assetLocationSite.siteRegion : asset.regionName;
          

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
            equipments: savedRecord.processingStatus === 'pending' ? '' : savedRecord.assetChanges.newEquipments ?? asset.equipments, // If pending, keep equipments empty
            assetOwner: ownerID,
            assetOwnerName: ownerName,
            assetOwnerPosition: ownerPosition,
            assetOwnerCostCenter: ownerCostCenter,
            assetOwnerDepartment: ownerDepartment,
            assetOwnerDivision: ownerDivision,
            subSiteID: subSiteID,
            subSiteName: subSiteName,
            siteID: ownerSiteID, // Owner's site, not asset location site
            siteName: ownerSiteName,
            siteGroupName: siteGroupName, // From asset location site
            regionName: regionName // From asset location site
          };

          // Store in the correct position to preserve order
          const resultItem = {
            existingAsset: existingAsset,
            pendingAsset: pendingAsset,
            availableEquipments: [] as string[], // Initialize as empty, will be loaded asynchronously
            adaptorSN: parseAdaptorSN(pendingAsset.equipments), // Extract adaptor serial number
            assetProcessed: true,
            processingStatus: savedRecord.processingStatus,
            savedChangeReason: savedRecord.assetChanges.changeReason || '',
            changeReason: savedRecord.assetChanges.changeReason || ''
          };
          
          orderedResults[index] = resultItem;

          // Load available equipments for this asset
          this.getAvailableEquipments(resultItem);

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
      processingStatus: result.processingStatus,
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
        const conditionValue = data.condition === true ? 'good' : 'bad';
        conditionMatch = conditionValue === filters.condition;
      }
      
      // Status filter
      const statusMatch = !filters.status || data.status === filters.status;

      // Processing status filter
      const processingStatusMatch = !filters.processingStatus || data.processingStatus === filters.processingStatus;

      return textMatch && conditionMatch && statusMatch && processingStatusMatch;
    };
    
    // Create filter object
    const filterObject = {
      text: this.filterText.toLowerCase(),
      condition: this.filterCondition,
      status: this.filterStatus,
      processingStatus: this.filterProcessingStatus
    };
    
    this.dataSource.filter = JSON.stringify(filterObject);
    
    // Reconnect table components after filtering
    setTimeout(() => {
      this.connectTableComponents();
    }, 0);
  }

  // Reset all filters
  resetFilters(): void {
    this.filterText = '';
    this.filterCondition = '';
    this.filterStatus = '';
    this.filterProcessingStatus = '';
    this.applyFilters();
  }

  // Check if any filters are active
  get hasActiveFilters(): boolean {
    return !!(this.filterText || this.filterCondition || this.filterStatus || this.filterProcessingStatus);
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
        // Add the found asset to the search results, using deep copies to avoid reference issues
        const newAsset = JSON.parse(JSON.stringify(asset));
        const pendingAsset = JSON.parse(JSON.stringify(asset)); // Deep copy for modifications
        
        // Ensure owner organizational information is properly set from user data if missing
        if (!pendingAsset.assetOwnerDepartment || !pendingAsset.assetOwnerDivision) {
          const owner = this.allUsers.find(user => user.userID === pendingAsset.assetOwner);
          if (owner) {
            pendingAsset.assetOwnerDepartment = pendingAsset.assetOwnerDepartment || owner.department;
            pendingAsset.assetOwnerDivision = pendingAsset.assetOwnerDivision || owner.division;
          }
        }

        // Set empty equipments by default
        pendingAsset.equipments = "";
        
        const newResult = {
          existingAsset: newAsset,
          pendingAsset: pendingAsset,
          availableEquipments: [] as string[], // Initialize as empty array, will be loaded asynchronously
          adaptorSN: parseAdaptorSN(newAsset.equipments), // Parse from existing asset, not pending
          assetProcessed: false,
          processingStatus: 'pending' as 'pending' | 'all_good' | 'edited', // Initial processing status
          savedChangeReason: '',
          changeReason: ''
        };

        // Increment pending assets count in local storage
        this.incrementPendingCount(1);

        // Increment scanned assets count in local storage
        this.incrementAssetScanned(1);

        // Save this to the db as pending asset with empty changes
        const pendingAssetChange: AssetChange = {
          assetTag: newAsset.assetTag,
          newStatus: newAsset.assetStatus,
          // ...the rest of the fields are set to undefined to indicate no changes
          changeReason: '',
          processingStatus: 'pending'
        };

        this.opnameSessionService.processScannedAsset(this.sessionID, pendingAssetChange).subscribe({
          error: (error) => {
            console.error('[OpnameAsset] Error saving newly scanned asset:', error);
          }
        });

        this.searchResults.unshift(newResult);

        // Load available equipments for this specific asset
        this.getAvailableEquipments(newResult);
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

  incrementPendingCount(increment: number): void {
    // Increment the pending count in local storage
    // To decrement, pass -1
    if (increment < 0 && parseInt(localStorage.getItem('pendingCount') || '0', 10) <= 0) {
      console.warn('[OpnameAsset] Cannot decrement pending count below zero');
      return; // Prevent decrementing below zero
    }
    const pendingCount = parseInt(localStorage.getItem('pendingCount') || '0', 10);
    localStorage.setItem('pendingCount', (pendingCount + increment).toString());
  }

  incrementAssetScanned(increment: number): void {
    // Increment the scanned asset count in local storage
    // To decrement, pass -1
    if (increment < 0 && parseInt(localStorage.getItem('assetCount') || '0', 10) <= 0) {
      console.warn('[OpnameAsset] Cannot decrement asset count below zero');
      return; // Prevent decrementing below zero
    }
    const assetCount = parseInt(localStorage.getItem('assetCount') || '0', 10);
    localStorage.setItem('assetCount', (assetCount + increment).toString());
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
        assetOwnerDepartment: matchedUser.department,
        assetOwnerDivision: matchedUser.division,
        
        // Update owner's site information when owner changes
        siteID: matchedUser.siteID,
        siteName: matchedUser.siteName,

        // Note: Asset location (subSiteID, subSiteName, ...) remains unchanged
        // when changing owner - only owner organizational data changes
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

  // Handle sub-site name input change
  onSubSiteInputChange(index: number): void {
    const result = this.searchResults[index];
    const input = result.pendingAsset.subSiteName?.trim().toLowerCase() || '';

    if (!input) {
      result.pendingAsset.subSiteID = undefined;
      result.pendingAsset.subSiteName = '';
      return;
    }

    const matchedSubSite = this.allSubSites.find(subSite => (
      subSite.subSiteName.toLowerCase() === input
    ));

    const matchedSite = this.allSites.find(site => (
      site.siteID === matchedSubSite?.siteID
    ));

    if (matchedSubSite && matchedSite) {
      // Update pendingAsset directly with matched sub-site data
      result.pendingAsset = {
        ...result.pendingAsset,
        subSiteID: matchedSubSite.subSiteID,
        subSiteName: matchedSubSite.subSiteName,
        siteGroupName: matchedSite.siteGroup,
        regionName: matchedSite.siteRegion
      };

      // Force change detection to update the view
      this.cdr.detectChanges();
    } else {
      // Invalid sub-site - explicitly set ID to undefined to trigger validation
      result.pendingAsset.subSiteID = undefined;
    }

    // Force change detection to update validation state
    this.cdr.detectChanges();
  }

  // Check if equipment is selected for a specific asset
  isEquipmentSelected(index: number, equipment: string): boolean {
    const result = this.searchResults[index];
    if (!result || !result.pendingAsset.equipments) return false;
    
    const equipmentList = result.pendingAsset.equipments.split(',').map(item => item.trim());
    
    // For adaptor, check if any equipment starts with "Adaptor"
    if (equipment === 'Adaptor') {
      return equipmentList.some(item => item.startsWith('Adaptor'));
    }
    
    return equipmentList.includes(equipment);
  }

  // Toggle equipment selection for a specific asset
  toggleEquipment(index: number, equipment: string): void {
    const result = this.searchResults[index];
    if (!result) return;

    let currentEquipments = result.pendingAsset.equipments || '';
    let equipmentList = currentEquipments ? currentEquipments.split(',').map(item => item.trim()) : [];

    if (equipment === 'Adaptor') {
      // Handle adaptor specially
      const hasAdaptor = equipmentList.some(item => item.startsWith('Adaptor'));

      if (hasAdaptor) {
        // Remove all adaptor entries
        equipmentList = equipmentList.filter(item => !item.startsWith('Adaptor'));
      } else {
        // Add adaptor with current serial number from ngModel
        const adaptorSN = result.adaptorSN?.trim().toUpperCase() || 'N/A';
        equipmentList.push(`Adaptor (s/n: ${adaptorSN})`);
      }
    } else {
      // Handle other equipment normally
      const equipmentIndex = equipmentList.indexOf(equipment);

      if (equipmentIndex > -1) {
        // Remove equipment
        equipmentList.splice(equipmentIndex, 1);
      } else {
        // Add equipment
        equipmentList.push(equipment);
      }
    }

    // Update the equipment string
    result.pendingAsset.equipments = equipmentList.filter(item => item).join(', ');

    // Force change detection and trigger form validation update
    this.cdr.detectChanges();
    
    // Additional delay to ensure DOM updates are complete
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  // Update adaptor serial number in equipment string (called on blur)
  updateAdaptorInEquipments(index: number): void {
    const result = this.searchResults[index];
    if (!result) return;

    // Only update if adaptor is currently selected
    if (this.isEquipmentSelected(index, 'Adaptor')) {
      let currentEquipments = result.pendingAsset.equipments || '';
      let equipmentList = currentEquipments ? currentEquipments.split(',').map(item => item.trim()) : [];
      
      // Remove existing adaptor entries
      equipmentList = equipmentList.filter(item => !item.startsWith('Adaptor'));
      
      // Add new adaptor with current serial number
      const adaptorSN = result.adaptorSN?.trim().toUpperCase() || 'N/A';
      equipmentList.push(`Adaptor (s/n: ${adaptorSN})`);
      
      // Update the equipment string
      result.pendingAsset.equipments = equipmentList.filter(item => item).join(', ');
      
      // Force change detection
      this.cdr.detectChanges();
    }
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

  // Helper function to normalize and compare equipment strings
  private normalizeEquipmentString(equipmentString: string): string {
    if (!equipmentString || equipmentString.trim() === '') return '';
    
    // Split, trim, filter empty
    const equipmentList = equipmentString
      .split(',')
      .map(item => item.trim())
      .filter(item => item !== '');
    
    // Normalize each equipment item
    const normalizedList = equipmentList.map(item => {
      // Handle adaptor entries specially to normalize the format
      if (item.startsWith('Adaptor')) {
        // Extract serial number if present
        const snMatch = item.match(/\(s\/n:\s*([^)]+)\s*\)/);
        if (snMatch) {
          const serialNumber = snMatch[1].trim().toUpperCase();
          return `Adaptor (s/n: ${serialNumber})`;
        } else {
          // If no serial number found, treat as plain adaptor
          return 'Adaptor';
        }
      }
      return item;
    });
    
    // Sort and rejoin
    return normalizedList.sort().join(', ');
  }

  // Check if equipments have actually changed (normalized comparison)
  hasEquipmentChanges(result: any): boolean {
    if (!result) return false;
    
    const normalizedPending = this.normalizeEquipmentString(result.pendingAsset.equipments || '');
    const normalizedExisting = this.normalizeEquipmentString(result.existingAsset.equipments || '');
    
    return normalizedPending !== normalizedExisting;
  }

  // Check if equipment exists for an asset being opnamed
  hasEquipment(result: any): boolean {
    if (!result.pendingAsset.equipments || result.pendingAsset.equipments.trim() === '') {
      return false; // No equipments stored for this asset
    }
    return true;
  }

  // Get equipment status text in Bahasa Indonesia
  getEquipmentStatus(result: any): string {
    if (!this.hasEquipment(result)) {
      return 'Minimal satu kelengkapan diisi';
    } else {
      if (!result || !result.availableEquipments || result.availableEquipments.length === 0) {
        return 'Memuat peralatan...'; // Loading equipments...
      }
      
      if (this.hasEquipmentChanges(result)) {
        return 'Terdapat perubahan dengan data master'; // There are changes
      } else {
        return 'Sesuai dengan data master'; // Matches master data
      }
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
           this.hasEquipmentChanges(result) || // Use normalized equipment comparison
           pending.assetOwner !== existing.assetOwner ||
           pending.assetOwnerPosition !== existing.assetOwnerPosition ||
           pending.assetOwnerCostCenter !== existing.assetOwnerCostCenter ||
           pending.assetOwnerDepartment !== existing.assetOwnerDepartment ||
           pending.assetOwnerDivision !== existing.assetOwnerDivision ||
           pending.siteID !== existing.siteID || // Owner site change is tracked when owner changes
           pending.subSiteID !== existing.subSiteID;

    // Auto-clear change reason if no changes exist
    if (!hasChanges && result.changeReason) {
      result.changeReason = '';
    }

    return hasChanges;
  }

  get invalidForms(): number {
    return document.getElementsByClassName('is-invalid').length;
  }

  // Get invalid forms count for a specific modal/asset
  getInvalidFormsForAsset(assetTag: string): number {
    const modalElement = document.getElementById(`edit-modal-${assetTag}`);
    if (!modalElement) return 0;
    return modalElement.getElementsByClassName('is-invalid').length;
  }

  // Get reason why save button is disabled for user feedback
  getSaveDisabledReason(result: any): string {
    if (!this.hasFormChangesForAsset(result)) {
      return 'Tidak ada perubahan terdeteksi. Silakan lakukan perubahan jika ada.';
    }
    
    const invalidCount = this.getInvalidFormsForAsset(result.pendingAsset.assetTag);
    if (invalidCount > 0) {
      if (invalidCount === 1 && (!result.changeReason || result.changeReason === '')) {
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

    // Final validation check using asset-specific form validation
    const invalidFormsCount = this.getInvalidFormsForAsset(result.pendingAsset.assetTag);
    if (invalidFormsCount > 0) {
      this.errorMessage = 'Please fix form validation errors before saving.';
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
    if (pending.assetOwnerDepartment !== existing.assetOwnerDepartment) {
      assetChanges.newOwnerDepartment = pending.assetOwnerDepartment;
    }
    if (pending.assetOwnerDivision !== existing.assetOwnerDivision) {
      assetChanges.newOwnerDivision = pending.assetOwnerDivision;
    }
    if (pending.subSiteID !== existing.subSiteID) {
      assetChanges.newSubSiteID = pending.subSiteID;
    }
    if (pending.siteID !== existing.siteID) {
      assetChanges.newOwnerSiteID = pending.siteID; // Owner site change - use correct field name for backend
    }
    
    // Set processing status to 'edited'
    result.processingStatus = 'edited';
    assetChanges.processingStatus = result.processingStatus;

    // Add required fields
    assetChanges.assetTag = existing.assetTag;
    assetChanges.changeReason = result.changeReason || '';
  
    // Set loading state while processing
    this.isSearching = true; 
    this.isLoading = true;

    this.opnameSessionService.processScannedAsset(this.sessionID, assetChanges).subscribe({
      next: () => {
        result.assetProcessed = true; // Mark the asset as processed
        result.savedChangeReason = result.changeReason || ''; // Save the change reason

        // Update table data source after processing is complete
        this.updateTableDataSource();
        this.cdr.detectChanges();

        // Decrement pending assets count in local storage
        this.incrementPendingCount(-1);

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
      newOwnerDepartment: existing.assetOwnerDepartment,
      newOwnerDivision: existing.assetOwnerDivision,
      newOwnerSiteID: existing.siteID,
      newSubSiteID: existing.subSiteID,
      changeReason: "No changes. Asset verified on " + this.opnameSession?.startDate,
      processingStatus: 'all_good'
    }
    
    result.processingStatus = 'all_good';

    // Decrement pending assets count in local storage
    this.incrementPendingCount(-1);

    this.isLoading = true;
    this.opnameSessionService.processScannedAsset(this.sessionID, assetChanges).subscribe({
      next: () => {
        // Deep copy the existingAsset to ensure no shared references
        result.pendingAsset = JSON.parse(JSON.stringify(result.existingAsset));
        
        // Ensure owner organizational information is properly set from user data if missing
        if (!result.pendingAsset.assetOwnerDepartment || !result.pendingAsset.assetOwnerDivision) {
          const owner = this.allUsers.find(user => user.userID === result.pendingAsset.assetOwner);
          if (owner) {
            result.pendingAsset.assetOwnerDepartment = result.pendingAsset.assetOwnerDepartment || owner.department;
            result.pendingAsset.assetOwnerDivision = result.pendingAsset.assetOwnerDivision || owner.division;
          }
        }
        
        // Update the adaptor SN
        result.adaptorSN = parseAdaptorSN(result.existingAsset.equipments);

        result.assetProcessed = true;
        result.savedChangeReason = assetChanges.changeReason || '';
        result.changeReason = ''; // Clear current editing change reason
        
        // Update table data source after processing is complete
        this.updateAdaptorInEquipments(index);
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

    const asset = this.searchResults[index]
    this.searchResults.splice(index, 1); // Remove the asset from the search results
    this.updateTableDataSource(); // Update the table after removal
    
    if (asset.assetProcessed) {
      // If the asset was processed, remove it from the session
      this.opnameSessionService.removeAssetFromSession(this.sessionID, asset.existingAsset.assetTag).subscribe({
        next: () => {
          // Successfully removed from session
          this.incrementAssetScanned(-1);

          if (asset.processingStatus === 'pending') {
            // Decrement pending assets count in local storage
            this.incrementPendingCount(-1);
          }

          this.successMessage = `Asset ${asset.existingAsset.assetTag} removed successfully.`;
        },
        error: (error: any) => {
          console.error('[OpnameAsset] Error removing asset from session:', error);
          this.errorMessage = 'Failed to remove asset. Please try again later.';
          this.showToast = true;
          setTimeout(() => this.showToast = false, 3000);
        }
      });
    }
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

  showDataPreview(): void {
    this.showPreview = true;
  }

  closePreview(): void {
    this.showPreview = false;
  }

  private checkScreenSize() {
    const newIsMobile = window.innerWidth < 860; // Define mobile breakpoint
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
    this.isMobile = window.innerWidth <= 860;
    
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
