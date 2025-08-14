import { Component, Input, OnInit, input, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetInfo } from '../model/asset-info.model';
import { ApiService } from '../services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { OpnameSessionService } from '../services/opname-session.service';
import { environment } from '../../environments/environments';
import { parseAdaptorSN } from '../utils';

@Component({
  selector: 'app-asset-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './asset-page.component.html',
  styleUrl: './asset-page.component.scss'
})
export class AssetPageComponent implements OnInit {
  public readonly serverURL = environment.serverURL; // Expose environment for use in the template

  @Input() isPending: boolean = false; // Flag to check if the user can edit assets in this opname session
  @Input() assetPage? : AssetInfo & { availableEquipments: string[] }; // Asset data with available equipments
  
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

  constructor(private apiService: ApiService, private router: Router, private opnameSessionService: OpnameSessionService, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    this.isLoading = true;
    this.checkScreenSize();
    
    // Only fetch data if NOT in pending mode (report mode)
    // In pending mode, data is passed via [assetPage] input
    if (!this.isPending) {
      this.isLoading = true;
      this.fetchAssetPage(); // Fetch asset page data when the component initializes
    } else {
      // In report mode, use the passed assetPage data and set UI state
      if (this.assetPage?.condition) {
        this.setLike();
      } else {
        this.setDislike();
      }
      this.isLoading = false;
    }
    
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

        this.getAvailableEquipments();
      },
      error: (error) => {
        // Handle the error appropriately, e.g., show a message to the user
        console.error('[AssetPage] Failed to fetch asset:', error);
        this.isLoading = false; // Set loading state to false even if there's an error
        this.errorMessage = 'Gagal memuat asset. Silakan coba lagi nanti.';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
      }
    });
  }

  private getAvailableEquipments(): void {
    const assetPage = this.assetPage ? this.assetPage : { productVariety: 'N/A', availableEquipments: [] };
    this.apiService.getAssetEquipments(assetPage.productVariety).subscribe({
      next: (equipmentsString: string) => {
        // Parse the comma-separated string into an array
        if (equipmentsString && typeof equipmentsString === 'string' && equipmentsString.trim() !== '') {
          assetPage.availableEquipments = equipmentsString.split(',').map((e: string) => e.trim()).filter((e: string) => e !== '');
        } else {
          assetPage.availableEquipments = []; // No equipments available for this product variety
        }
        
        this.cdr.detectChanges(); // Trigger change detection to update the UI
      },
      error: (error) => {
        console.error('[OpnameAsset] Error fetching available equipments:', error);
        this.errorMessage = 'Gagal memuat peralatan yang tersedia. Silakan coba lagi nanti.';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
        assetPage.availableEquipments = []; // Fallback to empty array on error
        this.cdr.detectChanges();
      }
    });
  }

  // Check if equipment is selected for the current asset (readonly display)
  isEquipmentSelected(equipment: string): boolean {
    if (!this.assetPage?.equipments) return false;

    return this.assetPage.equipments.includes(equipment);
  }

  parseAdaptorSN(equipments?: string): string {
    return parseAdaptorSN(equipments || '') || '';
  }
}
