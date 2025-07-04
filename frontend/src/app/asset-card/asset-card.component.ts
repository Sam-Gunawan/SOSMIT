import { Component} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Assetinfo } from '../model/assetinfo.model';
import { ApiService } from '../services/api.service';
import { ActivatedRoute, Route, Router } from '@angular/router';

@Component({
  selector: 'app-asset-card',
  imports: [CommonModule],
  templateUrl: './asset-card.component.html',
  styleUrl: './asset-card.component.scss'
})
export class AssetCardComponent {
  assetsOnSite?: Assetinfo[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

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
        this.isLoading = false;
        console.log('[AssetCard] Assets fetched successfully:', this.assetsOnSite);
      },
      error: (error) => {
        this.errorMessage = 'Failed to fetch assets. Please try again later.';
        this.isLoading = false;
        console.error('[AssetCard] Error fetching assets:', error);
      }
    });
  }
}
