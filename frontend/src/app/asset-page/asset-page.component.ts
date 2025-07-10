import { Component, OnInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Assetinfo } from '../model/assetinfo.model';
import { ApiService } from '../services/api.service';
import { ActivatedRoute } from '@angular/router';
import { SitePageComponent } from '../site-page/site-page.component';
import { AssetCardComponent } from '../asset-card/asset-card.component';

@Component({
  selector: 'app-asset-page',
  imports: [CommonModule],
  templateUrl: './asset-page.component.html',
  styleUrl: './asset-page.component.scss'
})
export class AssetPageComponent {
  assetTag = input.required<string>();
  assetPage? : Assetinfo;
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(private apiService: ApiService) {
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
      siteGroupName: 'N/A',
      regionName: 'N/A',
    };
  }
  
  ngOnInit(): void {
    this.fetchAssetPage(); // Fetch asset page data when the component initializes
  }
  
  isLiked = false;
  isDisliked = false;

  setLike() {
    this.isLiked = true;
    this.isDisliked = false;
  }

  setDislike() {
    this.isLiked = false;
    this.isDisliked = true;
  }

  fetchAssetPage(): void {
    this.isLoading = true; // Set loading state to true before fetching data
    this.apiService.getAssetDetails(this.assetTag()).subscribe({
      next: (asset) => {
        this.assetPage = asset; // Update the assetPage with the fetched data
        this.isLoading = false; // Set loading state to false after data is fetched
        console.log('[AssetPage] Asset fetched successfully:', this.assetPage);
      },
      error: (error) => {
        // Handle the error appropriately, e.g., show a message to the user
        console.error('[AssetPage] Failed to fetch asset:', error);
        this.isLoading = false; // Set loading state to false even if there's an error
        this.errorMessage = 'Failed to load asset. Please try again later.';
      }
    });
  }
}
