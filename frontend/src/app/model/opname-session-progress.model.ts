export interface OpnameSessionProgress {
    id: number; // Unique identifier for the progress item
    assetTag: string;
    assetChanges: {
        newSerialNumber?: string;
        newStatus?: string;
        newStatusReason?: string;
        newCondition?: number; // 0 = bad, 1 = good, 2 = lost/missing
        newConditionNotes?: string;
        newConditionPhotoURL?: string;
        newLossNotes?: string;
        newLocation?: string;
        newRoom?: string;
        newEquipments?: string;
        newOwnerID?: number;
        newOwnerSiteID?: number;
        newOwnerPosition?: string;
        newOwnerDepartment?: string;
        newOwnerDivision?: string;
        newOwnerCostCenter?: number;
        newSubSiteID?: number;
        changeReason?: string;
        actionNotes?: string;
    };
    processingStatus: 'pending' | 'edited' | 'all_good';
}
