import { Component, Input, input, OnInit, HostListener} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetInfo } from '../model/asset-info.model';
import { ApiService } from '../services/api.service';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { AssetPageComponent } from '../asset-page/asset-page.component';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-asset-card',
  imports: [CommonModule, FormsModule, AssetPageComponent, MatPaginatorModule],
  templateUrl: './asset-card.component.html',
  styleUrl: './asset-card.component.scss'
})
export class AssetCardComponent {
  @Input() showHeader: boolean = true;
  @Input() siteID: number = -1;
  @Input() deptID: number = -1;

  assetsOnLocation: AssetInfo[] = []; // This will be populated from the backend
  originalAssetsOnLocation: AssetInfo[] = []; // Keep original data
  filteredAssetsOnLocation: AssetInfo[] = [];
  paginatedAssetsOnLocation: AssetInfo[] = []; // For displaying paginated results
  isLoading: boolean = true;
  errorMessage: string = '';
  showToast: boolean = false;
  hasSearched: boolean = false; // Track if user has performed a search
  showSearchForm: boolean = false; // Track if search form is visible on mobile

  // Pagination properties
  pageSize: number = 10;
  pageIndex: number = 0;
  totalItems: number = 0;

  // Advanced search form fields
  searchCriteria = {
    assetTag: '',
    serialNumber: '',
    assetName: '',
    assetOwnerName: '',
    subSiteName: '',
    assetStatus: '',
    condition: '',
  };

  // Pre-computed unique values for datalist options
  uniqueOwnerNames: string[] = [];
  subSiteNames: string[] = [];

  constructor(private apiService: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.initAssetsOnLocation(); // Fetch assets when the component initializes
    this.fetchSubSiteNames();
  }

  initAssetsOnLocation(): void {
    this.isLoading = true;
    this.apiService.getAssetsOnLocation(this.siteID, this.deptID).subscribe({
      next: (assets: AssetInfo[]) => {
        this.assetsOnLocation = assets;
        this.originalAssetsOnLocation = [...this.assetsOnLocation]; // Keep original copy
        this.filteredAssetsOnLocation = [...this.assetsOnLocation];
        this.totalItems = this.assetsOnLocation.length;
        this.updatePaginatedList();
        
        // Populate unique values for datalist options
        this.populateUniqueValues();
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        console.error('[SitePage] Error loading assets:', error.error.error);
        this.errorMessage = error.error.error || 'Gagal memuat aset. Silakan coba lagi';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
      }
    });
  }

  getUniqueValuesFromObj(array: any[], key: string): any[] {
    // Extract unique values from an array of objects based on a specific key
    if (!array || array.length === 0) {
      return [];
    }
    
    const uniqueValues = new Set(
      array
        .map(item => item[key])
        .filter(value => value && value !== '' && typeof value === 'string')
    );
    
    return Array.from(uniqueValues).sort();
  }

  fetchSubSiteNames(): void {
    this.isLoading = true;
    this.apiService.getSubSitesBySiteID(Number(this.route.snapshot.paramMap.get('id'))).subscribe({
      next: (subSites) => {
        this.subSiteNames = subSites.map(subSite => subSite.subSiteName);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Gagal memuat nama sub-site. Silakan coba lagi nanti.';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
        this.isLoading = false;
        console.error('[AssetCard] Error fetching sub-site names:', error);
      }
    });
  }

  private populateUniqueValues(): void {
    // Populate unique values for all datalist options
    this.uniqueOwnerNames = this.getUniqueValuesFromObj(this.originalAssetsOnLocation, 'assetOwnerName');
  }

  private filterAssetsByField(assetList: AssetInfo[], fieldName: keyof AssetInfo, criteria: string): AssetInfo[] {
    if (!criteria || criteria.trim() === '') {
      return assetList;
    }

    const lowerCriteria = criteria.toLowerCase();
    
    return assetList.filter(asset => {
      const fieldValue = asset[fieldName];
      
      // Handle different field types
      if (fieldName === 'condition') {
        // Special handling for condition field (boolean)
        return criteria === 'Good' ? asset.condition === true : asset.condition === false;
      } else if (typeof fieldValue === 'string') {
        // String fields - partial match
        return fieldValue.toLowerCase().includes(lowerCriteria);
      }
      
      return false;
    });
  }

  performAdvancedSearch(): void {
    this.hasSearched = true;
    let filteredList = [...this.originalAssetsOnLocation];

    // Filter using the helper method
    if (this.searchCriteria.assetTag?.trim()) {
      filteredList = this.filterAssetsByField(filteredList, 'assetTag', this.searchCriteria.assetTag);
    }
    if (this.searchCriteria.serialNumber?.trim()) {
      filteredList = this.filterAssetsByField(filteredList, 'serialNumber', this.searchCriteria.serialNumber);
    }
    if (this.searchCriteria.assetName?.trim()) {
      filteredList = this.filterAssetsByField(filteredList, 'assetName', this.searchCriteria.assetName);
    }
    if (this.searchCriteria.assetOwnerName?.trim()) {
      filteredList = this.filterAssetsByField(filteredList, 'assetOwnerName', this.searchCriteria.assetOwnerName);
    }
    if (this.searchCriteria.subSiteName?.trim()) {
      filteredList = this.filterAssetsByField(filteredList, 'subSiteName', this.searchCriteria.subSiteName);
    }
    if (this.searchCriteria.assetStatus?.trim()) {
      filteredList = this.filterAssetsByField(filteredList, 'assetStatus', this.searchCriteria.assetStatus);
    }
    if (this.searchCriteria.condition?.trim()) {
      filteredList = this.filterAssetsByField(filteredList, 'condition', this.searchCriteria.condition);
    }

    this.filteredAssetsOnLocation = filteredList;
    this.totalItems = filteredList.length;
    this.pageIndex = 0; // Reset to first page
    this.updatePaginatedList();
    
    // Hide search form on mobile after search
    if (window.innerWidth <= 768) {
      this.showSearchForm = false;
    }
  }

  updatePaginatedList(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedAssetsOnLocation = this.filteredAssetsOnLocation.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedList();
  }

  toggleSearchForm(): void {
    this.showSearchForm = !this.showSearchForm;
  }

  resetSearchForm(): void {
    this.searchCriteria = {
      assetTag: '',
      serialNumber: '',
      assetName: '',
      assetOwnerName: '',
      subSiteName: '',
      assetStatus: '',
      condition: '',
    };
    
    // Reset search state
    this.hasSearched = false;
    
    // If we have searched before, reset to show all assets
    if (this.originalAssetsOnLocation.length > 0) {
      this.filteredAssetsOnLocation = [...this.originalAssetsOnLocation];
      this.totalItems = this.originalAssetsOnLocation.length;
      this.pageIndex = 0;
      this.updatePaginatedList();
    }
  }
}
