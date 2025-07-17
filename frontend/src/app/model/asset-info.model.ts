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
