import { Component, OnInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Assetinfo } from '../model/assetinfo.model';
import { ApiService } from '../services/api.service';
import { ActivatedRoute } from '@angular/router';
import { SitePageComponent } from '../site-page/site-page.component';

@Component({
  selector: 'app-asset-page',
  imports: [CommonModule],
  templateUrl: './asset-page.component.html',
  styleUrl: './asset-page.component.scss'
})
export class AssetPageComponent {
  assetPage? : Assetinfo;

  constructor(private route: ActivatedRoute, private apiService: ApiService) {
    const assetList: Assetinfo[] = new SitePageComponent(this.route, this.apiService).assetCardList;
    const tag = this.route.snapshot.paramMap.get('tag');
    this.assetPage = assetList.find (asset => asset.assetTag === tag);
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
}
