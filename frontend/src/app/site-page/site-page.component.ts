import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { ActivatedRoute } from '@angular/router';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { Siteinfo } from '../model/siteinfo.model';
import { Assetinfo } from '../model/assetinfo.model';
import { AssetCardComponent } from '../asset-card/asset-card.component';

@Component({
  selector: 'app-site-page',
  imports: [CommonModule, AssetCardComponent],
  templateUrl: './site-page.component.html',
  styleUrl: './site-page.component.scss'
})
export class SitePageComponent {
  sitePage: Siteinfo;
  siteList?: Siteinfo[] = []; // Initialize siteList as an empty array
  isLoading: boolean = true; // Loading state to show a spinner or loading indicator
  errorMessage: string = '';

  constructor(private route: ActivatedRoute, private apiService: ApiService) {
    this.sitePage = {
      siteID: -1,
      siteName: '',
      siteGroup: '',
      siteRegion: '',
      siteGA: -1,
      opnameSessionID: -1,
      opnameStatus: '',
      opnameDate: ''
    };
  }

  ngOnInit(): void {
    this.fetchSitePage(); // Fetch site page data when the component initializes
  } 

  assetCardList: Assetinfo[] = [
    {
      assetID: 1,
      assetIcon: 'assets/desktop.svg',
      assetTag: 'SMPC00000001',
      serialNumber: 'SGH7J2L9Q4M',
      assetStatus: 'deployed',
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
      assetIcon: 'assets/laptop.svg',
      assetTag: 'SMLT00000012',
      serialNumber: '5CD3009LBE',
      assetStatus: 'on loan',
      category: 'Hardware',
      subCategory: 'Processing Unit',
      productVariety: 'Laptop',
      assetBrand: 'HP',
      assetName: 'HP Zbook Power G8',
      assetOwner: 'BAYUP02',
      siteName: 'Area Retail Office Singaraja'
    },
    {
      assetID: 3,
      assetIcon: 'assets/monitor.svg',
      assetTag: 'SMMN00000001',
      serialNumber: '3CQ9175CNT',
      assetStatus: 'deployed',
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
      assetIcon: 'assets/ups.svg',
      assetTag: 'SMPU00000001',
      serialNumber: '3B3455X20483',
      assetStatus: 'deployed',
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
      assetIcon: 'assets/handheld.svg',
      assetTag: 'SMTP00000001',
      serialNumber: 'S20254578225064',
      assetStatus: 'deployed',
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
      assetIcon: 'assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 6,
      assetIcon: 'assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 6,
      assetIcon: 'assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 6,
      assetIcon: 'assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 6,
      assetIcon: 'assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 6,
      assetIcon: 'assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 6,
      assetIcon: 'assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 6,
      assetIcon: 'assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 6,
      assetIcon: 'assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 6,
      assetIcon: 'assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 6,
      assetIcon: 'assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 6,
      assetIcon: 'assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 6,
      assetIcon: 'assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 6,
      assetIcon: 'assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    },
    {
      assetID: 6,
      assetIcon: 'assets/printer.svg',
      assetTag: 'SMPR00000003',
      serialNumber: 'XXZHJ231947513',
      assetStatus: 'deployed',
      category: 'Hardware',
      subCategory: 'Peripheral',
      productVariety: 'Printer/Multifunction',
      assetBrand: 'Zebra',
      assetName: 'Thermal Printer Zebra ZQ320 Plus',
      assetOwner: 'ANANDAA',
      siteName: 'Area Marketing Office Denpasar'
    }
  ]

  fetchSitePage(): void {
    this.apiService.getUserSiteCards().subscribe({
      next: (siteCardsList) => {
        this.siteList = siteCardsList; // Update the siteList with the fetched data
        console.log('[SitePage] Site cards fetched successfully:', this.siteList);
        const id = Number(this.route.snapshot.paramMap.get('id'));
        const fetchedSite = this.siteList?.find((site: Siteinfo) => site.siteID === id);
        this.isLoading = false; // Set loading state to false after data is fetched
        if (fetchedSite) {
          this.sitePage = fetchedSite; // Set the sitePage to the fetched site
        } else {
          this.errorMessage = 'Site not found.';
          console.error('[SitePage] Site not found for ID:', id);
          return
        }
        console.log('sitePage', this.sitePage);
      },
      error: (error) => {
        // Handle the error appropriately, e.g., show a message to the user
        console.error('[SitePage] Failed to fetch site cards:', error);
        this.isLoading = false; // Set loading state to false even if there's an error
        this.errorMessage = 'Failed to load site cards. Please try again later.';
      }
    });
  }
}
