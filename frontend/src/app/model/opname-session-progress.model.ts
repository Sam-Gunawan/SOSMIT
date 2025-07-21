export interface OpnameSessionProgress {
    id: number; // Unique identifier for the progress item
    assetTag: string;
    assetChanges: {
        newStatus?: string;
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
    };
}
