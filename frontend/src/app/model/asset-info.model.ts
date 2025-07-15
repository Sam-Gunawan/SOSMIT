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
    conditionPhotoURL?: string; // Optional field for condition photo URL
    location?: string; // Optional field for location
    room?: string; // Optional field for room
    assetOwner: number;
    assetOwnerName: string;
    assetOwnerPosition: string;
    assetOwnerCostCenter: number;
    siteID: number;
    siteName: string;
    siteGroupName: string;
    regionName: string;
}
