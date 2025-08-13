export interface User {
    userID: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    position: string;
    department: string;
    division: string;
    siteID: number | null;
    siteName: string;
    siteGroupName: string;
    regionName: string;
    costCenterID: number | null;
}