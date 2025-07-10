export interface OpnameSession {
    sessionID: number;
    siteID: number;
    userID: number;
    status: 'Outdated' | 'Active' | 'Completed' | 'Verified' | 'Rejected';
    startDate: string;
    endDate?: string;
    approverID: number | null; // Nullable if not yet approved
}