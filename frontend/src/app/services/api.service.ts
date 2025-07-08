import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { Siteinfo } from '../model/siteinfo.model';
import { Assetinfo } from '../model/assetinfo.model';
import { formatDate, titleCase } from '../reusable_functions';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // This service will handle API calls, such as login, fetching data, etc.
  private authApiUrl = 'http://localhost:8080/api/auth'
  private userApiUrl = 'http://localhost:8080/api/user'
  private siteApiUrl = 'http://localhost:8080/api/site'
  private assetApiUrl = 'http://localhost:8080/api/asset'

  constructor(private http: HttpClient, private router: Router) {}
  login(credentials: {username: string, password: string}): Observable<any> {
    return this.http.post(`${this.authApiUrl}/login`, credentials).pipe(
      // Handle the response here if needed.
      // The 'tap' operator can be used to perform side effects without modifying the response.
      // Side effects meaning actions that you perform with the response, like storing tokens.
      tap((response: any) => {
        // Here, we store the JWT token in localStorage so users can stay logged in.
        // If the login is successful and we receive a token...
        if (response && response.token) {
          // ...store the token in localStorage.
          localStorage.setItem('auth_token', response.token);
        }
      })
    );
  }

  logout(): void {
    // This method will simply remove the token from localStorage.
    localStorage.removeItem('auth_token');
    
    // Then, redirect to login page.
    this.router.navigate(['/login']);
  }

  getUserProfile(username: string): Observable<any> {
    // This method will fetch the user profile data.
    // Authorization header is already handled by AuthInterceptor at ../services/auth.interceptor.ts
    return this.http.get(`${this.userApiUrl}/${username}`);
  }

  getUserSiteCards(): Observable<Siteinfo[]> {
    // This method will fetch the site cards that the user has access to.
    return this.http.get<Siteinfo[]>(`${this.userApiUrl}/site-cards`).pipe(
      map((response: any) => {
        return response.site_cards.map((site: any) => ({
          siteID: site.SiteID,
          siteName: site.SiteName,
          siteGroup: site.SiteGroupName,
          siteRegion: site.RegionName,
          siteGA: site.SiteGaID,
          opnameSessionID: site.OpnameSessionID,
          opnameStatus: site.OpnameStatus,
          opnameDate: formatDate(new Date(site.OpnameDate))
        }))
      }), // Extract site cards from the response
      tap((siteCards: Siteinfo[]) => {
        // Log the fetched site cards for debugging purposes.
        console.log('[ApiService] Fetched site cards:', siteCards);
      })
    );
  }

  getAssetDetails(assetTag: string): Observable<any> {
    // This method will fetch the details of a specific asset by its tag.
    return this.http.get<Assetinfo>(`${this.assetApiUrl}/${assetTag}`).pipe(
      map((response: any) => {
        // Map the response to the desired format.
        return {
          assetTag: response.asset_tag,
          assetIcon: this.getAssetIcon(response.product_variety), // Generate icon path based on product variety
          serialNumber: response.serial_number,
          assetStatus: response.status,
          statusReason: response.status_reason || '-1', // Default to '-1' if status reason is not provided
          category: response.product_category,
          subCategory: response.product_subcategory,
          productVariety: response.product_variety,
          assetBrand: response.brand_name,
          assetName: response.product_name,
          condition: response.condition,
          conditionPhotoURL: response.condition_photo_url || '', // Default to empty string if condition photo
          location: response.location,
          room: response.room,
          assetOwner: response.owner_id,
          assetOwnerName: titleCase(response.owner_name) || '', // Default to empty string if owner name is not provided
          assetOwnerPosition: titleCase(response.owner_position),
          assetOwnerCostCenter: response.owner_cost_center,
          siteID: response.site_id,
          siteGroupName: response.site_group_name,
          regionName: response.region_name
        };
      }),
      tap((assetDetails: Assetinfo) => {
        // Log the fetched asset details for debugging purposes.
        console.log('[ApiService] Fetched asset details:', assetDetails);
      })
    );
  }


  getAssetsOnSite(siteID: number): Observable<any> {
    // This method will fetch all assets on a specific site.
    return this.http.get<Assetinfo[]>(`${this.siteApiUrl}/${siteID}/assets`).pipe(
      map((response: any) => {
        // Map the response to the desired format.
        return response.assets_on_site.map((asset: any) => ({
          assetTag: asset.AssetTag,
          assetIcon: this.getAssetIcon(asset.ProductVariety), // Generate icon path based on product variety
          serialNumber: asset.SerialNumber,
          assetStatus: asset.Status,
          statusReason: asset.StatusReason || '-1', // Default to '-1' if status reason is not provided
          category: asset.ProductCategory,
          subCategory: asset.ProductSubCategory,
          productVariety: asset.ProductVariety,
          assetBrand: asset.BrandName,
          assetName: asset.ProductName,
          condition: asset.Condition,
          conditionPhotoURL: asset.ConditionPhotoURL || '', // Default to empty string if condition photo
          assetOwner: asset.OwnerID,
          assetOwnerName: titleCase(asset.OwnerName) || '', // Default to empty string if owner name is not provided
          siteName: asset.SiteID
        }));
      }),
      tap((response: any) => {
        // Log the fetched assets for debugging purposes.
        console.log(`[ApiService] Fetched assets for site ${siteID}:`, response);
      })
    );
  }

  // Helper method to get icon path based on product variety
  private getAssetIcon(productVariety: string): string {
    const varietyMap: { [key: string]: string } = {
      'Laptop': 'assets/laptop.svg',
      'Desktop': 'assets/desktop.svg',
      'Monitor': 'assets/monitor.svg',
      'Uninterrupted Power Supply': 'assets/ups.svg',
      'Personal Digital Assistant': 'assets/handheld.svg',
      'Printer/Multifunction': 'assets/printer.svg'
    };
    
    return varietyMap[productVariety] || 'assets/desktop.svg'; // Default to desktop icon if variety not found
  }
}
