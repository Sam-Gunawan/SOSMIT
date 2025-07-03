import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Siteinfo } from '../siteinfo';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { ActivatedRoute } from '@angular/router';
import { Assetinfo } from '../assetinfo';

@Component({
  selector: 'app-site-page',
  imports: [CommonModule],
  templateUrl: './site-page.component.html',
  styleUrl: './site-page.component.scss'
})
export class SitePageComponent {
  sitePage? : Siteinfo;

  constructor(private route: ActivatedRoute) {
    const siteList: Siteinfo[] = new DashboardComponent().siteCardList;
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.sitePage = siteList.find (site => site.siteID === id);
  }

  assetCardList: Assetinfo[] = [
    {
      assetID: 1,
      assetIcon: 
      assetTag: SMPC00000001,
      serialNumber: SGH7J2L9Q4M,
      assetStatus: Deployed,
      category: Hardware,
      subCategory: Processing Unit,
      productVariety: Desktop,
      assetBrand: HP,
      assetName: HP ProDesk 400 G4 SFF,
      assetOwner: LESTARIL,
      siteName: Head Office Jakarta,
    }
  ]
}
