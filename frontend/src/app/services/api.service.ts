  import { Injectable } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { Router } from '@angular/router';
  import { Observable } from 'rxjs';
  import { tap, map } from 'rxjs/operators';
  import { SiteInfo } from '../model/site-info.model';
  import { AssetInfo } from '../model/asset-info.model';
  import { User } from '../model/user.model';
  import { formatDate, formatRupiah, titleCase } from '../utils';
  import { environment } from '../../environments/environments';
import { SubSite } from '../model/sub-site.model';

  @Injectable({
    providedIn: 'root'
  })
  export class ApiService {
    // This service will handle API calls, such as login, fetching data, etc.
    private authApiUrl = `${environment.serverURL}/api/auth`
    private userApiUrl = `${environment.serverURL}/api/user`
    private siteApiUrl = `${environment.serverURL}/api/site`
    private assetApiUrl = `${environment.serverURL}/api/asset`
    private uploadApiUrl = `${environment.serverURL}/api/upload`

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
      return this.http.get<any>(`${this.userApiUrl}/${username}`).pipe(
        map((response: any) => {
          const u = response.user || response; // fallback if not wrapped
          return {
            userID: u.user_id,
            username: u.username,
            email: u.email,
            firstName: titleCase(u.first_name || ''),
            lastName: titleCase(u.last_name || ''),
            position: titleCase(u.position || ''),
            department: titleCase(u.department || ''),
            division: titleCase(u.division || ''),
            siteID: u.site_id ?? null,
            siteName: u.site_name || '',
            siteGroupName: u.site_group || u.site_group_name || '',
            regionName: u.region_name || '',
            costCenterID: u.cost_center_id ?? null
          } as User;
        }),
        tap(userProfile => console.log('[ApiService] Fetched user profile:', userProfile))
      );
    }

    getUserByID(userID: number): Observable<User> {
      return this.http.get<any>(`${this.userApiUrl}/${userID}`).pipe(
        map((response: any) => {
          const u = response.user || response;
            return {
              userID: u.user_id,
              username: u.username,
              email: u.email,
              firstName: titleCase(u.first_name || ''),
              lastName: titleCase(u.last_name || ''),
              position: titleCase(u.position || ''),
              department: titleCase(u.department || ''),
              division: titleCase(u.division || ''),
              siteID: u.site_id ?? null,
              siteName: u.site_name || '',
              siteGroupName: u.site_group || u.site_group_name || '',
              regionName: u.region_name || '',
              costCenterID: u.cost_center_id ?? null
            } as User;
        }),
        tap(user => console.log('[ApiService] Fetched user:', user))
      );
    }

    getAllUsers(): Observable<User[]> {
      return this.http.get<any>(`${this.userApiUrl}/all`).pipe(
        map((response: any) => {
          const list = response.users || [];
          return list.map((u: any) => ({
            userID: u.user_id ?? u.UserID,
            username: u.username ?? u.Username,
            email: u.email ?? u.Email,
            firstName: titleCase((u.first_name ?? u.FirstName) || ''),
            lastName: titleCase((u.last_name ?? u.LastName) || ''),
            position: titleCase((u.position ?? u.Position) || ''),
            department: titleCase((u.department ?? u.Department) || ''),
            division: titleCase((u.division ?? u.Division) || ''),
            siteID: (u.site_id ?? u.SiteID) ?? null,
            siteName: (u.site_name ?? u.SiteName) || '',
            siteGroupName: (u.site_group ?? u.site_group_name ?? u.SiteGroupName) || '',
            regionName: (u.region_name ?? u.RegionName) || '',
            costCenterID: (u.cost_center_id ?? u.CostCenterID) ?? null
          } as User));
        }),
        tap(users => console.log('[ApiService] Fetched users:', users))
      );
    }

    getAllSites(): Observable<SiteInfo[]> {
      // This method will fetch all sites from the database.
      return this.http.get<SiteInfo[]>(`${this.siteApiUrl}/all`).pipe(
        map((response: any) => {
          // Map the response to the desired format.
          return response.sites.map((site: any) => ({
            siteID: site.SiteID,
            siteName: site.SiteName,
            siteGroup: site.SiteGroupName,
            siteRegion: site.RegionName,
            siteGaID: site.SiteGaID,
            siteGaName: titleCase(site.SiteGaName),
            siteGaEmail: site.SiteGaEmail,
            // Default opname fields for sites list
            opnameSessionID: 0,
            opnameUserID: 0,
            opnameUserName: '',
            opnameStatus: '',
            opnameDate: ''
          }));
        }),
        tap((sites: SiteInfo[]) => {
          // Log the fetched sites for debugging purposes.
          console.log('[ApiService] Fetched sites:', sites);
        })
      )
    }

    getUserSiteCards(): Observable<SiteInfo[]> {
      // This method will fetch the site cards that the user has access to.
      return this.http.get<SiteInfo[]>(`${this.userApiUrl}/site-cards`).pipe(
        map((response: any) => {
          return response.site_cards.map((site: any) => ({
            siteID: site.SiteID,
            siteName: site.SiteName,
            siteGroup: site.SiteGroupName,
            siteRegion: site.RegionName,
            siteGaID: site.SiteGaID || 0, // Default to 0 if not provided
            siteGaName: site.SiteGaName || '',
            siteGaEmail: site.SiteGaEmail || '',
            opnameSessionID: site.OpnameSessionID,
            opnameUserID: site.OpnameUserID || 0,
            opnameUserName: site.OpnameUserName || '',
            opnameStatus: site.OpnameStatus,
            opnameDate: formatDate(new Date(site.OpnameDate))
          }))
        }), // Extract site cards from the response
        tap((siteCards: SiteInfo[]) => {
          // Log the fetched site cards for debugging purposes.
          console.log('[ApiService] Fetched site cards:', siteCards);
        })
      );
    }

    getSiteByID(siteID: number): Observable<SiteInfo> {
      // This method will fetch a specific site by its ID.
      return this.http.get<SiteInfo>(`${this.siteApiUrl}/${siteID}`).pipe(
        map((response: any) => {
          // Map the response to the desired format.
          return {
            siteID: response.site_id,
            siteName: response.site_name,
            siteGroup: response.site_group_name,
            siteRegion: response.region_name,
            siteGaID: response.site_ga_id,
            siteGaName: titleCase(response.site_ga_name),
            siteGaEmail: response.site_ga_email,
            // Default opname fields for individual site fetch
            opnameSessionID: 0,
            opnameUserID: 0,
            opnameUserName: '',
            opnameStatus: '',
            opnameDate: ''
          };
        }),
        tap((siteInfo: SiteInfo) => {
          // Log the fetched site info for debugging purposes.
          console.log('[ApiService] Fetched site info:', siteInfo);
        })
      );
    }

    getAllSubSites(): Observable<SubSite[]> {
      // This method will fetch all sub-sites from the database.
      return this.http.get<SubSite[]>(`${this.siteApiUrl}/all-sub-sites`).pipe(
        map((response: any) => {
          // Map the response to the desired format.
          return response.sub_sites.map((subSite: any) => ({
            subSiteID: subSite.SubSiteID,
            subSiteName: subSite.SubSiteName,
            siteID: subSite.SiteID
          }));
        }),
        tap((subSites: SubSite[]) => {
          // Log the fetched sub-sites for debugging purposes.
          console.log('[ApiService] Fetched sub-sites:', subSites);
        })
      );
    }

    getSubSiteByID(subSiteID: number): Observable<SubSite> {
      // This method will fetch a specific sub-site by its ID.
      return this.http.get<SubSite>(`${this.siteApiUrl}/sub-site/${subSiteID}`).pipe(
        map((response: any) => {
          // Map the response to the desired format.
          return {
            subSiteID: response.sub_site_id,
            subSiteName: response.sub_site_name,
            siteID: response.site_id
          };
        })
      );
    }

    getSubSitesBySiteID(siteID: number): Observable<SubSite[]> {
      // This method will fetch all sub-sites for a specific site by its ID.
      return this.http.get<SubSite[]>(`${this.siteApiUrl}/${siteID}/sub-sites`).pipe(
        map((response: any) => {
          // Map the response to the desired format.
          return response.sub_sites.map((subSite: any) => ({
            subSiteID: subSite.SubSiteID,
            subSiteName: subSite.SubSiteName,
            siteID: subSite.SiteID
          }));
        }),
        tap((subSites: SubSite[]) => {
          // Log the fetched sub-sites for debugging purposes.
          console.log('[ApiService] Fetched sub-sites:', subSites);
        })
      );
    }

    getAssetByAssetTag(assetTag: string): Observable<any> {
      // This method will fetch the details of a specific asset by its tag.
      return this.http.get<AssetInfo>(`${this.assetApiUrl}/tag/${assetTag}`).pipe(
        map((response: any) => {
          // Map the response to the desired format.
          return {
            assetTag: response.asset_tag,
            assetIcon: this.getAssetIcon(response.product_variety),
            serialNumber: response.serial_number,
            assetStatus: response.status,
            statusReason: response.status_reason || '-1',
            category: response.product_category,
            subCategory: response.product_subcategory,
            productVariety: response.product_variety,
            assetBrand: response.brand_name,
            assetName: response.product_name,
            condition: response.condition,
            conditionNotes: response.condition_notes,
            conditionPhotoURL: response.condition_photo_url || '',
            location: response.location,
            room: response.room,
            equipments: response.equipments || '',
            totalCost: formatRupiah(response.total_cost),
            assetOwner: response.owner_id,
            assetOwnerName: titleCase(response.owner_name) || '',
            assetOwnerPosition: titleCase(response.owner_position),
            assetOwnerDepartment: titleCase(response.owner_department),
            assetOwnerDivision: titleCase(response.owner_division),
            assetOwnerCostCenter: response.owner_cost_center,
            subSiteID: response.sub_site_id,
            subSiteName: response.sub_site_name,
            siteID: response.site_id,
            siteName: response.site_name,
            siteGroupName: response.site_group_name,
            regionName: response.region_name
          };
        }),
        tap((assetDetails: AssetInfo) => {
          // Log the fetched asset details for debugging purposes.
          console.log('[ApiService] Fetched asset details:', assetDetails);
        })
      );
    }

    getAssetsOnSite(siteID: number): Observable<any> {
      // This method will fetch all assets on a specific site.
      return this.http.get<AssetInfo[]>(`${this.siteApiUrl}/${siteID}/assets`).pipe(
        map((response: any) => {
          // Map the response to the desired format.
          return response.assets_on_site.map((asset: any) => ({
            assetTag: asset.AssetTag,
            serialNumber: asset.SerialNumber,
            assetStatus: asset.Status,
            statusReason: asset.StatusReason || '-1',
            category: asset.ProductCategory,
            subCategory: asset.ProductSubCategory,
            productVariety: asset.ProductVariety,
            assetBrand: asset.BrandName,
            assetName: asset.ProductName,
            condition: asset.Condition,
            conditionNotes: asset.ConditionNotes,
            conditionPhotoURL: asset.ConditionPhotoURL || '',
            location: asset.Location,
            room: asset.Room,
            equipments: asset.Equipments || '',
            totalCost: formatRupiah(asset.TotalCost),
            assetOwner: asset.OwnerID,
            assetOwnerName: titleCase(asset.OwnerName) || '',
            assetOwnerPosition: titleCase(asset.OwnerPosition),
            assetOwnerDepartment: titleCase(asset.OwnerDepartment),
            assetOwnerDivision: titleCase(asset.OwnerDivision),
            assetOwnerCostCenter: asset.OwnerCostCenter,
            subSiteID: asset.SubSiteID,
            subSiteName: asset.SubSiteName,
            siteID: asset.SiteID,
            siteName: asset.SiteName,
            siteGroupName: asset.SiteGroupName,
            regionName: asset.RegionName
          }));
        }),
        tap((response: any) => {
          // Log the fetched assets for debugging purposes.
          console.log(`[ApiService] Fetched assets for site ${siteID}:`, response);
        })
      );
    }

    // Search for an asset by serial number
    getAssetBySerialNumber(serialNumber: string): Observable<any> {
      // This method will search for an asset using its serial number
      return this.http.get<AssetInfo>(`${this.assetApiUrl}/serial/${serialNumber}`).pipe(
        map((response: any) => {
          // Map the response to the desired format for consistency with getAssetDetails
          return {
            assetTag: response.asset_tag,
            serialNumber: response.serial_number,
            assetStatus: response.status,
            statusReason: response.status_reason,
            category: response.product_category,
            subCategory: response.product_subcategory,
            productVariety: response.product_variety,
            assetBrand: response.brand_name,
            assetName: response.product_name,
            condition: response.condition,
            conditionNotes: response.condition_notes,
            conditionPhotoURL: response.condition_photo_url,
            location: response.location,
            room: response.room,
            equipments: response.equipments || '',
            totalCost: formatRupiah(response.total_cost),
            assetOwner: response.owner_id,
            assetOwnerName: titleCase(response.owner_name) || '',
            assetOwnerPosition: titleCase(response.owner_position),
            assetOwnerDepartment: titleCase(response.owner_department),
            assetOwnerDivision: titleCase(response.owner_division),
            assetOwnerCostCenter: response.owner_cost_center,
            subSiteID: response.sub_site_id,
            subSiteName: response.sub_site_name,
            siteID: response.site_id,
            siteName: response.site_name,
            siteGroupName: response.site_group_name,
            regionName: response.region_name,
            assetIcon: this.getAssetIcon(response.product_variety)
          };
        }),
        tap((assetDetails: AssetInfo) => {
          console.log('[ApiService] Asset found by serial number:', assetDetails);
        })
      );
    }

    getAssetEquipments(productVariety: string): Observable<any> {
      // This method will fetch the equipments related to a specific product variety.

      // If the product variety consists of forward slashes (e.g. Printer/Multifunction), replace with %252F (double encoded forward slash)
      productVariety = productVariety.replace(/\//g, '%252F');
      return this.http.get<any>(`${this.assetApiUrl}/${productVariety}/equipments`).pipe(
        map((response: any) => {
          // Map the response to the desired format
          return response.equipments || "";
        }),
        tap((response: any) => {
          console.log('[ApiService] Fetched equipments for product variety:', response.product_variety, response.equipments);
        })
      );
    }

    // Universal search for assets (by tag or serial number)
    searchAsset(searchTerm: string, searchType: 'asset_tag' | 'serial_number'): Observable<any> {
      // This is a wrapper that calls the appropriate search method based on the search type
      if (searchType === 'asset_tag') {
        return this.getAssetByAssetTag(searchTerm);
      } else {
        return this.getAssetBySerialNumber(searchTerm);
      }
    }

    uploadConditionPhoto(file: File, oldPhotoURL: string): Observable<any> {
      // This method will upload a photo to the server
      // Create a FormData object to hold the file
      const formData = new FormData();
      formData.append('condition_photo', file, file.name);
      formData.append('old_condition_photo_url', oldPhotoURL); // Include the old photo URL to handle deletion on the server

      return this.http.post(`${this.uploadApiUrl}/photo`, formData).pipe(
        tap((response: any) => {
          // Log the response for debugging purposes.
          console.log('[ApiService] Photo uploaded successfully:', response);
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
