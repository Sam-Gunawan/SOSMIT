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
    newOwnerDepartment?: string;
    newOwnerDivision?: string;
    newOwnerCostCenter?: number | null; // null when VACANT / unset
    newOwnerSiteID?: number; // Owner's site (where the owner works)
    newSubSiteID?: number; // Asset's physical location (sub-site)
    changeReason?: string;
    processingStatus: 'pending' | 'edited' | 'all_good';
}