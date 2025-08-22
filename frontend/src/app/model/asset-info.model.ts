export interface AssetInfo {
    assetTag: string;
    assetIcon: string;
    serialNumber: string;
    assetStatus: string;
    statusReason?: string;
    category: string;
    subCategory: string;
    productVariety: string;
    assetBrand: string;
    assetName: string;
    condition: number; // 0 = bad, 1 = good, 2 = lost/missing
    conditionNotes: string;
    lossNotes: string;
    conditionPhotoURL: string;
    location: string;
    room: string;
    equipments: string;
    totalCost: string;
    assetOwner: number | undefined; // Allow undefined for editing validation
    assetOwnerName: string;
    assetOwnerPosition: string;
    assetOwnerDepartment: string;
    assetOwnerDivision: string;
    assetOwnerCostCenter: number;
    subSiteID: number | undefined;
    subSiteName: string;
    siteID?: number | undefined;
    deptID?: number | undefined;
    siteName: string;
    siteGroupName: string;
    regionName: string;
    changeReason?: string; // Only used during editing
}
