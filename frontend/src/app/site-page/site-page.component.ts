import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api/api.service';
import { ActivatedRoute } from '@angular/router';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { Siteinfo } from '../siteinfo';
import { Assetinfo } from '../assetinfo';
import { AssetCardComponent } from '../asset-card/asset-card.component';

@Component({
  selector: 'app-site-page',
  imports: [CommonModule, AssetCardComponent],
  templateUrl: './site-page.component.html',
  styleUrl: './site-page.component.scss'
})
export class SitePageComponent {
  sitePage? : Siteinfo;

  constructor(private route: ActivatedRoute, private apiService: ApiService) {
    const siteList: Siteinfo[] = new DashboardComponent(this.apiService).siteCardList;
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.sitePage = siteList.find (site => site.siteID === id);
  }

  assetCardList: Assetinfo[] = [
    {
      assetID: 1,
      assetIcon: '/assets/desktop.svg',
      assetTag: 'SMPC00000001',
      serialNumber: 'SGH7J2L9Q4M',
      assetStatus: 'Deployed',
      category: 'Hardware',
      subCategory: 'Processing Unit',
      productVariety: 'Desktop',
      assetBrand: 'HP',
      assetName: 'HP ProDesk 400 G4 SFF',
      assetOwner: 'LESTARIL',
      siteName: 'Head Office Jakarta'
    },
    {
      assetID: 2,
      assetIcon: '/assets/laptop.svg',
      assetTag: 'SMLT00000003',
      serialNumber: '5CD2597SON',
      assetStatus: 'Deployed',
      category: 'Hardware',
      subCategory: 'Processing Unit',
      productVariety: 'Laptop',
      assetBrand: 'HP',
      assetName: 'HP Notebook',
      assetOwner: 'PUJIA',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 3,
      assetIcon: '/assets/monitor.svg',
      assetTag: 'SMMN00000001',
      serialNumber: '3CQ9175CNT',
      assetStatus: 'Deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Monitor',
      assetBrand: 'HP',
      assetName: 'HP LE1901w 19-inch Widescreen LCD',
      assetOwner: 'LESTARIL',
      siteName: 'Head Office Jakarta'
    },
    {
      assetID: 4,
      assetIcon: '/assets/ups.svg',
      assetTag: 'SMPU00000001',
      serialNumber: '3B3455X20483',
      assetStatus: 'Deployed',
      category: 'Hardware',
      subCategory: 'Power Supply',
      productVariety: 'Uninterrupted Power Supply',
      assetBrand: 'APC',
      assetName: 'APC Back-UPS Pro 550 VA',
      assetOwner: 'LESTARIL',
      siteName: 'Head Office Jakarta'
    },
    {
      assetID: 5,
      assetIcon: '/assets/handheld.svg',
      assetTag: 'SMTP00000001',
      serialNumber: 'S20254578225064',
      assetStatus: 'Deployed',
      category: 'Hardware',
      subCategory: 'Processing Unit',
      productVariety: 'Personal Digital Assistant',
      assetBrand: 'Zebra',
      assetName: 'Zebra TC26',
      assetOwner: 'EKKOF',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 6,
      assetIcon: '/assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'Deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    }
  ]
}
