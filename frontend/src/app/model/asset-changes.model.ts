export interface AssetChange {
    assetTag: string;
    newSerialNumber?: string;
    newStatus: string;
    newStatusReason?: string;
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