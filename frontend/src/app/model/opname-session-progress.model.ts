export interface OpnameSessionProgress {
    id: number; // Unique identifier for the progress item
    assetTag: string;
    assetChanges: {
        newSerialNumber?: string;
        newStatus?: string;
        newStatusReason?: string;
        newCondition?: boolean;
        newConditionNotes?: string;
        newConditionPhotoURL?: string;
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
    };
    processingStatus: 'pending' | 'edited' | 'all_good';
}
