export interface AssetChange {
    assetTag: string;
    newStatus: string;
    newStatusReason?: string;
    newCondition?: boolean;
    newConditionNotes?: string;
    newConditionPhotoURL?: string;
    newLocation?: string;
    newRoom?: string;
    newEquipments?: string;
    newOwnerID?: number;
    newSiteID?: number;
    changeReason?: string;
}