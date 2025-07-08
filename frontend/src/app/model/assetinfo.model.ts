export interface Assetinfo {
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
    conditionPhotoURL?: string; // Optional field for condition photo URL
    location?: string; // Optional field for location
    room?: string; // Optional field for room
    assetOwner: number;
    assetOwnerName: string;
    assetOwnerPosition: string;
    assetOwnerCostCenter: number;
    siteID: number;
    siteGroupName: string;
    regionName: string;
}
