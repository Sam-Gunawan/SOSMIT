export interface AssetInfo {
    assetTag: string;
    assetIcon: string;
    serialNumber: string;
    assetStatus: string;
    statusReason?: string; // Optional field for status reason
    category: string;
    subCategory: string;
    productVariety: string;
    assetBrand: string;
    assetName: string;
    condition: boolean;
    conditionNotes: string;
    conditionPhotoURL: string;
    location: string;
    room: string;
    equipments: string;
    assetOwner: number | undefined; // Allow undefined for editing validation
    assetOwnerName: string;
    assetOwnerPosition: string;
    assetOwnerDepartment: string;
    assetOwnerDivision: string;
    assetOwnerCostCenter: number;
    subSiteID: number | undefined; // SubSite where the asset is physically located
    subSiteName: string; // Name of the sub-site where the asset is physically located
    siteID: number | undefined; // Site where the asset is physically located (parent of SubSite)
    siteName: string; // Name of the site where the asset is physically located
    siteGroupName: string; // Site group where the asset is physically located
    regionName: string; // Region where the asset is physically located
    changeReason?: string; // Only used during editing
}
