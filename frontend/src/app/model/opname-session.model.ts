export interface OpnameSession {
    sessionID: number;
    siteID: number;
    userID: number;
    status: 'Outdated' | 'Active' | 'Submitted' | 'Escalated' | 'Verified' | 'Rejected';
    startDate: string;
    endDate?: string;
    managerReviewerID?: number | null;
    managerReviewedAt?: string | null;
    l1ReviewerID?: number | null;
    l1ReviewedAt?: string | null;
}