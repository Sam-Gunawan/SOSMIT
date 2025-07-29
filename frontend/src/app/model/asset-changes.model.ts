export interface AssetChange {
    assetTag: string;
    newStatus: string;
    newStatusReason?: string;
    newSerialNumber?: string;
    newCondition?: boolean;
    newConditionNotes?: string;
    newConditionPhotoURL?: string;
    newLocation?: string;
    newRoom?: string;
    newEquipments?: string;
    newOwnerID?: number;
    newOwnerPosition?: string;
    newOwnerCostCenter?: number;
    newSiteID?: number;
    changeReason?: string;
}