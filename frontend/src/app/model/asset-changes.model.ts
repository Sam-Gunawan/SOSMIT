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
    newOwnerSiteID?: number;
    newSiteID?: number;
    changeReason?: string;
    processingStatus: 'pending' | 'edited' | 'all_good';
}