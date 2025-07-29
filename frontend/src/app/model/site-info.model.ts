export interface SiteInfo {
    siteID: number;
    siteName: string;
    siteGroup: string;  // Renamed from siteGroupName for consistency
    siteRegion: string; // Renamed from regionName for consistency
    siteGaID: number;
    siteGaName: string;
    siteGaEmail: string;
    // Opname-related fields (from site-card-info)
    opnameSessionID: number;
    opnameUserID: number;
    opnameUserName: string;
    opnameStatus: string;
    opnameDate: string;
}