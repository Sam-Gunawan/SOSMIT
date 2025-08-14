import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, OnChanges } from '@angular/core';
import { AssetInfo } from '../model/asset-info.model';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { FormsModule } from '@angular/forms';

export interface PreviewTableData {
  assetTag: string;
  assetName: string;
  serialNumber: string;
  equipments: string;
  // regionName: string;
  siteGroupName: string;
  subSiteName: string;
  siteName: string;
  room: string;
  userName: string;
  position: string;
  division: string;
  department: string;
  ownerDepartment: string;
  costCenter: number;
  totalCost: string;
  status: string;
  condition: boolean | null;
  conditionNotes: string;
  processingStatus: 'pending' | 'all_good' | 'edited';
  changeReason: string;
}

export interface AssetWithProcessingStatus extends AssetInfo {
  processingStatus: 'pending' | 'all_good' | 'edited';
}

@Component({
  selector: 'app-opname-preview',
  imports: [CommonModule, MatTableModule, MatSortModule, FormsModule],
  templateUrl: './opname-preview.component.html',
  styleUrl: './opname-preview.component.scss'
})
export class OpnamePreviewComponent implements OnInit, OnChanges {
  @Input() searchResults: AssetInfo[] = [];
  @Input() originalAssets: AssetInfo[] = []; // Original data before any modifications
  @Input() updatedAssets: AssetWithProcessingStatus[] = []; // Updated data after modifications with processing status
  @Input() assetProcessingStatus: { [assetTag: string]: 'pending' | 'all_good' | 'edited' } = {}; // Processing status mapping
  @Input() assetChangeReasons: { [assetTag: string]: string } = {}; // Change reason mapping
  @Output() closePreviewEvent = new EventEmitter<void>();

  originalDataSource = new MatTableDataSource<PreviewTableData>([]);
  updatedDataSource = new MatTableDataSource<PreviewTableData>([]);
  
  // Legacy dataSource for backward compatibility - returns the data source being filtered
  get dataSource() { 
    return this.filterTarget === 'updated' ? this.updatedDataSource : this.originalDataSource; 
  }
  
  displayedColumns: string[] = ['assetTag', 'assetName', 'serialNumber', 'equipments', 'siteGroupName', 'subSiteName', 'ownerDepartment', 'siteName', 'room', 'userName', 'position', 'division', 'department', 'costCenter', 'totalCost', 'status', 'condition', 'conditionNotes', 'processingStatus', 'changeReason'];

  // Filter properties
  filterText: string = '';
  filterCondition: string = '';
  filterStatus: string = '';
  filterProcessingStatus: string = '';
  showFilterForm: boolean = true;
  
  // Filter target selection
  filterTarget: 'original' | 'updated' = 'updated'; // Default to updated data filtering
  
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

  readonly filterTargetOptions = [
    { value: 'updated', label: 'Updated Data' },
    { value: 'original', label: 'Original Data' }
  ];

  ngOnInit() {
    this.loadPreviewData();
    this.syncScrollPosition();
  }

  ngOnChanges() {
    this.loadPreviewData();
  }

  loadPreviewData() {
    // Use searchResults as fallback for both original and updated if specific arrays aren't provided
    const originalData = this.originalAssets.length > 0 ? this.originalAssets : this.searchResults;
    const updatedData = this.updatedAssets.length > 0 ? this.updatedAssets : this.searchResults;

    // If still no data, show empty tables
    if (originalData.length === 0 && updatedData.length === 0) {
      this.originalDataSource.data = [];
      this.updatedDataSource.data = [];
      return;
    }

    // Load original data
    const originalTableData: PreviewTableData[] = originalData.map(asset => ({
      assetTag: asset.assetTag,
      assetName: asset.assetName,
      serialNumber: asset.serialNumber,
      equipments: asset.equipments,
      // regionName: asset.regionName,
      siteGroupName: asset.siteGroupName,
      subSiteName: asset.subSiteName,
      ownerDepartment: asset.assetOwnerDepartment,
      siteName: asset.siteName,
      room: asset.room,
      userName: asset.assetOwnerName,
      position: asset.assetOwnerPosition,
      division: asset.assetOwnerDivision,
      department: asset.assetOwnerDepartment,
      costCenter: asset.assetOwnerCostCenter,
      totalCost: asset.totalCost,
      status: asset.assetStatus,
      condition: asset.condition,
      conditionNotes: asset.conditionNotes,
      processingStatus: this.getProcessingStatus(asset, 'original'),
      changeReason: '' // Original data has no change reason
    }));

    // Load updated data
    const updatedTableData: PreviewTableData[] = updatedData.map(asset => ({
      assetTag: asset.assetTag,
      assetName: asset.assetName,
      serialNumber: asset.serialNumber,
      equipments: asset.equipments,
      // regionName: asset.regionName,
      siteGroupName: asset.siteGroupName,
      subSiteName: asset.subSiteName,
      ownerDepartment: asset.assetOwnerDepartment,
      siteName: asset.siteName,
      room: asset.room,
      userName: asset.assetOwnerName,
      position: asset.assetOwnerPosition,
      division: asset.assetOwnerDivision,
      department: asset.assetOwnerDepartment,
      costCenter: asset.assetOwnerCostCenter,
      totalCost: asset.totalCost,
      status: asset.assetStatus,
      condition: asset.condition,
      conditionNotes: asset.conditionNotes,
      processingStatus: this.getProcessingStatus(asset, 'updated'),
      changeReason: this.getChangeReason(asset)
    }));

    this.originalDataSource.data = originalTableData;
    this.updatedDataSource.data = updatedTableData;

    // Apply current filters after data is loaded
    this.applyFilters();
  }

  private getProcessingStatus(asset: AssetInfo, type: 'original' | 'updated'): 'pending' | 'all_good' | 'edited' {
    // Original data is always in "all good" state (matches master data)
    if (type === 'original') {
      return 'all_good';
    }

    // For updated data, check if we have processing status information
    if (this.assetProcessingStatus[asset.assetTag]) {
      return this.assetProcessingStatus[asset.assetTag];
    }

    // If we have updatedAssets with processing status, use that
    if (this.updatedAssets.length > 0) {
      const updatedAsset = this.updatedAssets.find(updated => updated.assetTag === asset.assetTag);
      if (updatedAsset && 'processingStatus' in updatedAsset) {
        return updatedAsset.processingStatus;
      }
    }

    // Fallback logic: if no explicit status, determine based on data comparison
    const originalAsset = this.originalAssets.find(orig => orig.assetTag === asset.assetTag);
    if (originalAsset) {
      // Check if there are any changes between original and updated
      const hasChanges = this.hasAssetChanges(originalAsset, asset);
      return hasChanges ? 'edited' : 'all_good';
    }

    // Default to pending if we can't determine the status
    return 'pending';
  }

  private getChangeReason(asset: AssetInfo): string {
    // Check if we have change reason mapping
    if (this.assetChangeReasons[asset.assetTag]) {
      return this.assetChangeReasons[asset.assetTag];
    }

    // If the asset has changeReason property, use that
    if ('changeReason' in asset && (asset as any).changeReason) {
      return (asset as any).changeReason;
    }

    // Default to empty string
    return '';
  }

  private normalizeEquipments(equipments: string): string {
    // Normalize equipments string by trimming and sorting them
    return equipments.split(',').map(e => e.trim()).sort().join(', ');
  }

  // Helper method to check if there are changes between two assets
  private hasAssetChanges(original: AssetInfo, updated: AssetInfo): boolean {
    return original.assetStatus !== updated.assetStatus ||
           original.serialNumber !== updated.serialNumber ||
           original.statusReason !== updated.statusReason ||
           original.condition !== updated.condition ||
           original.conditionNotes !== updated.conditionNotes ||
           original.conditionPhotoURL !== updated.conditionPhotoURL ||
           original.location !== updated.location ||
           original.room !== updated.room ||
           this.normalizeEquipments(original.equipments) !== this.normalizeEquipments(updated.equipments) ||
           original.assetOwner !== updated.assetOwner ||
           original.assetOwnerPosition !== updated.assetOwnerPosition ||
           original.assetOwnerCostCenter !== updated.assetOwnerCostCenter ||
           original.assetOwnerDepartment !== updated.assetOwnerDepartment ||
           original.assetOwnerDivision !== updated.assetOwnerDivision ||
           original.siteID !== updated.siteID ||
           original.subSiteID !== updated.subSiteID;
  }

  // Method to check if a specific field has changed between original and updated data
  isFieldChanged(assetTag: string, fieldName: keyof PreviewTableData, currentElement: PreviewTableData): boolean {
    // Find the corresponding element in the other dataset
    const otherDataSource = this.isOriginalElement(currentElement) ? this.updatedDataSource : this.originalDataSource;
    const otherElement = otherDataSource.data.find(item => item.assetTag === assetTag);
    
    if (!otherElement) {
      return false; // No comparison data available
    }

    // Compare the field values
    const currentValue = currentElement[fieldName];
    const otherValue = otherElement[fieldName];

    // If equipments are being compared, normalize them first
    if (fieldName === 'equipments') {
      return this.normalizeEquipments(currentValue as string) !== this.normalizeEquipments(otherValue as string);
    }
    
    return currentValue !== otherValue;
  }

  // Helper method to determine if an element belongs to original data
  private isOriginalElement(element: PreviewTableData): boolean {
    return this.originalDataSource.data.includes(element);
  }

  closePreview() {
    this.closePreviewEvent.emit();
  }

  // Apply filters to the table data - optimized for performance with 1000+ assets
  applyFilters(): void {
    if (!this.hasActiveFilters) {
      // Clear all filters if no active filters
      this.clearAllFilters();
      return;
    }

    // Create reusable filter criteria object
    const filterCriteria = this.createFilterCriteria();
    
    if (this.filterTarget === 'updated') {
      // Filter updated data and match original data to filtered results
      this.applyFiltersToDataSource(this.updatedDataSource, filterCriteria);
      this.matchDataSourceToFiltered(this.originalDataSource, this.updatedDataSource);
    } else {
      // Filter original data and match updated data to filtered results
      this.applyFiltersToDataSource(this.originalDataSource, filterCriteria);
      this.matchDataSourceToFiltered(this.updatedDataSource, this.originalDataSource);
    }
  }

  /**
   * Creates filter criteria object - optimized to avoid repeated object creation
   */
  private createFilterCriteria() {
    return {
      text: this.filterText.toLowerCase(),
      condition: this.filterCondition,
      status: this.filterStatus,
      processingStatus: this.filterProcessingStatus
    };
  }

  /**
   * Applies filters to a specific data source using optimized filtering
   */
  private applyFiltersToDataSource(dataSource: MatTableDataSource<PreviewTableData>, criteria: any): void {
    if (!dataSource) return;
    
    // Use optimized filter predicate that minimizes string operations
    dataSource.filterPredicate = (data: PreviewTableData) => {
      // Text filter - optimized string matching
      if (criteria.text) {
        const searchText = criteria.text;
        const searchableText = `${data.assetTag}|${data.assetName}|${data.serialNumber}|${data.userName}|${data.costCenter}`.toLowerCase();
        if (!searchableText.includes(searchText)) {
          return false;
        }
      }
      
      // Condition filter - optimized boolean check
      if (criteria.condition) {
        const conditionValue = data.condition === true ? 'good' : 'bad';
        if (conditionValue !== criteria.condition) {
          return false;
        }
      }
      
      // Status filter - direct string comparison
      if (criteria.status && data.status !== criteria.status) {
        return false;
      }

      // Processing status filter - direct string comparison
      if (criteria.processingStatus && data.processingStatus !== criteria.processingStatus) {
        return false;
      }

      return true;
    };
    
    // Apply filter using a simple string to trigger filtering
    dataSource.filter = JSON.stringify(criteria);
  }

  /**
   * Matches one data source to show only assets that correspond to filtered data in another source
   * Optimized for performance with Set-based lookups
   */
  private matchDataSourceToFiltered(targetDataSource: MatTableDataSource<PreviewTableData>, sourceDataSource: MatTableDataSource<PreviewTableData>): void {
    if (!targetDataSource || !sourceDataSource) return;
    
    // Use Set for O(1) lookup performance with large datasets
    const filteredAssetTagsSet = new Set(sourceDataSource.filteredData.map(asset => asset.assetTag));
    
    // Simple and fast filter predicate using Set lookup
    targetDataSource.filterPredicate = (data: PreviewTableData) => {
      return filteredAssetTagsSet.has(data.assetTag);
    };
    
    // Apply filter
    targetDataSource.filter = 'match-filtered-data';
  }

  /**
   * Clears all filters from both data sources
   */
  private clearAllFilters(): void {
    if (this.originalDataSource) {
      this.originalDataSource.filter = '';
    }
    if (this.updatedDataSource) {
      this.updatedDataSource.filter = '';
    }
  }

  /**
   * Handles filter target change (switch between original and updated data filtering)
   */
  onFilterTargetChange(): void {
    // Re-apply filters with new target
    this.applyFilters();
  }

  /**
   * Sets the filter target and automatically shows filter form if not visible
   */
  setFilterTarget(target: 'original' | 'updated'): void {
    this.filterTarget = target;
    
    // Show filter form when user activates filtering
    if (!this.showFilterForm) {
      this.showFilterForm = true;
    }
    
    // Re-apply any existing filters
    this.applyFilters();
  }

  // Reset all filters
  resetFilters(): void {
    this.filterText = '';
    this.filterCondition = '';
    this.filterStatus = '';
    this.filterProcessingStatus = '';
    this.clearAllFilters();
  }

  // Check if any filters are active
  get hasActiveFilters(): boolean {
    return !!(this.filterText || this.filterCondition || this.filterStatus || this.filterProcessingStatus);
  }

  // Toggle filter form visibility
  toggleFilterForm(): void {
    this.showFilterForm = !this.showFilterForm;
  }

  // TODO: optimize scroll sync using throttling or debouncing
  private syncScrollPosition(): void {
    const originalTable = document.getElementById('original-data-table');
    const updatedTable = document.getElementById('updated-data-table');

    if (originalTable && updatedTable) {
      let isSyncing = false;

      const syncScroll = (source: HTMLElement, target: HTMLElement) => {
        if (isSyncing) return;

        isSyncing = true;
        target.scrollLeft = source.scrollLeft;
        target.scrollTop = source.scrollTop;
        isSyncing = false;
      };

      originalTable.addEventListener('scroll', () => syncScroll(originalTable, updatedTable), { passive: true });
      updatedTable.addEventListener('scroll', () => syncScroll(updatedTable, originalTable), { passive: true });
    }
  }
}
