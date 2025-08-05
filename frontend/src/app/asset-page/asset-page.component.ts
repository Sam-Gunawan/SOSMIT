import { Component, Input, OnInit, input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetInfo } from '../model/asset-info.model';
import { ApiService } from '../services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { OpnameSessionService } from '../services/opname-session.service';
import { environment } from '../../environments/environments';

@Component({
  selector: 'app-asset-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './asset-page.component.html',
  styleUrl: './asset-page.component.scss'
})
export class AssetPageComponent implements OnInit {
  public readonly serverURL = environment.serverURL; // Expose environment for use in the template

  @Input() isPending: boolean = false; // Flag to check if the user can edit assets in this opname session
  @Input() assetPage? : AssetInfo;
  
  screenSize: 'large' | 'small' = 'large';
  isMobile: boolean = false;

  assetTag = input.required<string>();
  sessionID: number = -1; // Default value, will be set later
  siteID: number = -1; // Site ID for the current opname session
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  showToast: boolean = false;

  // Selected status reason (for radio buttons)
  selectedStatusReason: 'Loss' | 'Obsolete' = 'Obsolete';

  // File to upload for condition photo
  conditionPhoto?: File;

  // Equipment options based on seed data (same as opname-asset)
  availableEquipments: string[] = [
    'Kabel power',
    'Adaptor',
    'Tas',
    'Kabel VGA',
    'Kabel USB', 
    'Simcard',
    'Handstrap',
    'Tali tas'
  ];

  constructor(private apiService: ApiService, private router: Router, private opnameSessionService: OpnameSessionService, private route: ActivatedRoute) {
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
      equipments: '',
      assetOwner: -1,
      assetOwnerName: 'N/A',
      assetOwnerPosition: 'N/A',
      assetOwnerDepartment: 'N/A',
      assetOwnerDivision: 'N/A',
      assetOwnerCostCenter: -1,
      subSiteID: -1,
      subSiteName: 'N/A',
      siteID: -1,
      siteName: 'N/A',
      siteGroupName: 'N/A',
      regionName: 'N/A',
    }; 
  }
  
  ngOnInit(): void {
    this.isLoading = true;
    this.checkScreenSize();
    this.fetchAssetPage(); // Fetch asset page data when the component initializes
    this.siteID = Number(this.route.snapshot.paramMap.get('id')); // Get site ID from route parameters
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768; // Define mobile breakpoint
    
    if (this.isMobile) {
      this.screenSize = 'small';
    } else {
      this.screenSize = 'large';
    }
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
    if (!this.isPending) {
      this.isLoading = true; // Set loading state to true before fetching data
      this.apiService.getAssetByAssetTag(this.assetTag()).subscribe({
        next: (asset) => {
          this.assetPage = asset; // Update the assetPage with the fetched data
          this.isLoading = false; // Set loading state to false after data is fetched
          if (this.assetPage?.condition) {
            this.setLike();
          } else {
            this.setDislike();
          }
        },
        error: (error) => {
          // Handle the error appropriately, e.g., show a message to the user
          console.error('[AssetPage] Failed to fetch asset:', error);
          this.isLoading = false; // Set loading state to false even if there's an error
          this.errorMessage = 'Failed to load asset. Please try again later.';
          this.showToast = true;
          setTimeout(() => this.showToast = false, 3000);
        }
      });
    } else {
      // If isPending is true, we assume the assetPage is already set and we just check the condition
      this.assetPage?.condition ? this.setLike() : this.setDislike();
    }

    this.isLoading = false;
  }

  // Check if equipment is selected for the current asset (readonly display)
  isEquipmentSelected(equipment: string): boolean {
    if (!this.assetPage?.equipments) return false;
    
    const equipmentList = this.assetPage.equipments.split(',').map(item => item.trim());
    return equipmentList.includes(equipment);
  }
}
