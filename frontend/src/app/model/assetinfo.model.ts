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
    assetOwner: number;
    assetOwnerName: string;
    siteID: number;
}
