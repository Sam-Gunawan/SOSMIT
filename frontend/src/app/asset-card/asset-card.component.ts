import { Component, Input, input, OnInit, HostListener} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetInfo } from '../model/asset-info.model';
import { ApiService } from '../services/api.service';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { AssetPageComponent } from '../asset-page/asset-page.component';

@Component({
  selector: 'app-asset-card',
  imports: [CommonModule, AssetPageComponent],
  templateUrl: './asset-card.component.html',
  styleUrl: './asset-card.component.scss'
})
export class AssetCardComponent {
  @Input() showHeader: boolean = true;

  assetsOnSite: AssetInfo[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  showToast: boolean = false;
  filter = input<string>(''); // Input property to filter asset cards
  selectedFilter: string = ''; // Track selected filter pill
  searchText: string = ''; // Track search input

  filteredAssetsOnSite: AssetInfo[] = [];

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
        this.filteredAssetsOnSite = [...assets];
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

  filterAssetCards(filterValue: string): void {
    console.log('[AssetCard] filterAssetCards called with value:', filterValue);
    this.searchText = filterValue;
    this.applyFilters();
  }

  filterByStatus(status: string): void {
    console.log('[AssetCard] filterByStatus called with status:', status);
    // Toggle selection: if same status is clicked, deselect it
    this.selectedFilter = this.selectedFilter === status ? '' : status;
    this.applyFilters();
  }

  filterByDropdown(status: string): void {
    this.selectedFilter = status;
    this.applyFilters();
  }

  applyFilters(): void {
    let filteredList = [...this.assetsOnSite];

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
  }

  clearAllFilters(): void {
    this.selectedFilter = '';
    this.searchText = '';
    this.filteredAssetsOnSite = [...this.assetsOnSite];
  }
}
