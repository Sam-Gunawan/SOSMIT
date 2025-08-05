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

  assetsOnSite: AssetInfo[] = [];
  originalAssetsOnSite: AssetInfo[] = []; // Keep original data
  filteredAssetsOnSite: AssetInfo[] = [];
  paginatedAssetsOnSite: AssetInfo[] = []; // For displaying paginated results
  isLoading: boolean = true;
  errorMessage: string = '';
  showToast: boolean = false;
  filter = input<string>(''); // Input property to filter asset cards
  selectedFilter: string = ''; // Track selected filter pill
  searchText: string = ''; // Track search input
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
    assetOwnerName: '',
    assetStatus: '',
    condition: '',
    assetBrand: '',
    assetName: '',
    category: '',
    subCategory: ''
  };

  // Pre-computed unique values for datalist options
  uniqueOwnerNames: string[] = [];
  uniqueBrands: string[] = [];
  uniqueCategories: string[] = [];
  uniqueSubCategories: string[] = [];

  constructor(private apiService: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.fetchAssetsOnSite(); // Fetch assets when the component initializes
  }

  fetchAssetsOnSite(): void {
    this.isLoading = true;
    const siteID = Number(this.route.snapshot.paramMap.get('id'));
    this.apiService.getAssetsOnSite(siteID).subscribe({
      next: (assets) => {
        this.assetsOnSite = assets;
        this.originalAssetsOnSite = [...assets]; // Keep original copy
        this.filteredAssetsOnSite = [...assets];
        this.totalItems = assets.length;
        this.updatePaginatedList();
        
        // Populate unique values for datalist options
        this.populateUniqueValues();
        
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

  private populateUniqueValues(): void {
    // Populate unique values for all datalist options
    this.uniqueOwnerNames = this.getUniqueValuesFromObj(this.originalAssetsOnSite, 'assetOwnerName');
    this.uniqueBrands = this.getUniqueValuesFromObj(this.originalAssetsOnSite, 'assetBrand');
    this.uniqueCategories = this.getUniqueValuesFromObj(this.originalAssetsOnSite, 'category');
    this.uniqueSubCategories = this.getUniqueValuesFromObj(this.originalAssetsOnSite, 'subCategory');
    
    console.log('[AssetCard] Populated unique values for datalist options');
  }

  performAdvancedSearch(): void {
    this.hasSearched = true;
    console.log('[AssetCard] Starting advanced search with criteria:', this.searchCriteria);
    console.log('[AssetCard] Original assets count:', this.originalAssetsOnSite.length);

    let filteredList = [...this.originalAssetsOnSite];

    // Filter by asset tag
    if (this.searchCriteria.assetTag && this.searchCriteria.assetTag.trim() !== '') {
      const assetTag = this.searchCriteria.assetTag.toLowerCase().trim();
      filteredList = filteredList.filter(asset => 
        asset.assetTag.toLowerCase().includes(assetTag)
      );
    }

    // Filter by serial number
    if (this.searchCriteria.serialNumber && this.searchCriteria.serialNumber.trim() !== '') {
      const serialNumber = this.searchCriteria.serialNumber.toLowerCase().trim();
      filteredList = filteredList.filter(asset => 
        asset.serialNumber.toLowerCase().includes(serialNumber)
      );
    }

    // Filter by asset owner name
    if (this.searchCriteria.assetOwnerName && this.searchCriteria.assetOwnerName.trim() !== '') {
      const ownerName = this.searchCriteria.assetOwnerName.toLowerCase().trim();
      filteredList = filteredList.filter(asset => 
        asset.assetOwnerName.toLowerCase().includes(ownerName)
      );
    }

    // Filter by asset status
    if (this.searchCriteria.assetStatus && this.searchCriteria.assetStatus !== '') {
      filteredList = filteredList.filter(asset => 
        asset.assetStatus === this.searchCriteria.assetStatus
      );
    }

    // Filter by condition
    if (this.searchCriteria.condition && this.searchCriteria.condition !== '') {
      const conditionValue = this.searchCriteria.condition === 'Good';
      filteredList = filteredList.filter(asset => 
        asset.condition === conditionValue
      );
    }

    // Filter by asset brand
    if (this.searchCriteria.assetBrand && this.searchCriteria.assetBrand.trim() !== '') {
      const brand = this.searchCriteria.assetBrand.toLowerCase().trim();
      filteredList = filteredList.filter(asset => 
        asset.assetBrand.toLowerCase().includes(brand)
      );
    }

    // Filter by asset name
    if (this.searchCriteria.assetName && this.searchCriteria.assetName.trim() !== '') {
      const name = this.searchCriteria.assetName.toLowerCase().trim();
      filteredList = filteredList.filter(asset => 
        asset.assetName.toLowerCase().includes(name)
      );
    }

    // Filter by category
    if (this.searchCriteria.category && this.searchCriteria.category.trim() !== '') {
      const category = this.searchCriteria.category.toLowerCase().trim();
      filteredList = filteredList.filter(asset => 
        asset.category.toLowerCase().includes(category)
      );
    }

    // Filter by sub category
    if (this.searchCriteria.subCategory && this.searchCriteria.subCategory.trim() !== '') {
      const subCategory = this.searchCriteria.subCategory.toLowerCase().trim();
      filteredList = filteredList.filter(asset => 
        asset.subCategory.toLowerCase().includes(subCategory)
      );
    }

    this.filteredAssetsOnSite = filteredList;
    this.totalItems = filteredList.length;
    this.pageIndex = 0; // Reset to first page
    this.updatePaginatedList();
    
    console.log(`[AssetCard] Search complete. Final results: ${filteredList.length} assets`);
    
    // Hide search form on mobile after search
    if (window.innerWidth <= 768) {
      this.showSearchForm = false;
    }
  }

  updatePaginatedList(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedAssetsOnSite = this.filteredAssetsOnSite.slice(startIndex, endIndex);
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
      assetOwnerName: '',
      assetStatus: '',
      condition: '',
      assetBrand: '',
      assetName: '',
      category: '',
      subCategory: ''
    };
    
    // Reset search state
    this.hasSearched = false;
    
    // If we have searched before, reset to show all assets
    if (this.originalAssetsOnSite.length > 0) {
      this.filteredAssetsOnSite = [...this.originalAssetsOnSite];
      this.totalItems = this.originalAssetsOnSite.length;
      this.pageIndex = 0;
      this.updatePaginatedList();
    }
  }

  filterAssetCards(filterValue: string): void {
    console.log('[AssetCard] Simple filter called with value:', filterValue);
    this.searchText = filterValue;
    this.performSimpleFilter();
  }

  filterByStatus(status: string): void {
    console.log('[AssetCard] filterByStatus called with status:', status);
    this.selectedFilter = this.selectedFilter === status ? '' : status;
    this.performSimpleFilter();
  }

  performSimpleFilter(): void {
    let filteredList = [...this.originalAssetsOnSite];

    // Apply status filter
    if (this.selectedFilter) {
      filteredList = filteredList.filter(asset => 
        asset.assetStatus === this.selectedFilter
      );
    }

    // Apply search text filter
    if (this.searchText) {
      const searchWords = this.searchText.toLowerCase().split(' ').filter(word => word.length > 0);
      filteredList = filteredList.filter(asset => {
        const searchableText = `${asset.assetName ?? ''} ${asset.assetBrand ?? ''} ${asset.assetTag ?? ''} ${asset.assetOwnerName ?? ''} ${asset.assetStatus ?? ''}`.toLowerCase();
        return searchWords.every(word => searchableText.includes(word));
      });
    }

    this.filteredAssetsOnSite = filteredList;
    this.totalItems = filteredList.length;
    this.pageIndex = 0;
    this.updatePaginatedList();
  }

  clearAllFilters(): void {
    this.selectedFilter = '';
    this.searchText = '';
    this.resetSearchForm();
  }
}
