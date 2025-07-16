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
    assetOwner: number | undefined; // Allow undefined for editing validation
    assetOwnerName: string;
    assetOwnerPosition: string;
    assetOwnerCostCenter: number;
    siteID: number | undefined; // Allow undefined for editing validation
    siteName: string;
    siteGroupName: string;
    regionName: string;
    changeReason?: string; // Only used during editing
}
