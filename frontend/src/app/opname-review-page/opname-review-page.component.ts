import { Component, OnInit } from '@angular/core';
import { OpnameSessionService } from '../services/opname-session.service';
import { ActivatedRoute, Router } from '@angular/router';
import { OpnameSession } from '../model/opname-session.model';
import { ApiService } from '../services/api.service';
import { User } from '../model/user.model';
import { SiteInfo } from '../model/site-info.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-opname-review-page',
  imports: [CommonModule],
  templateUrl: './opname-review-page.component.html',
  styleUrl: './opname-review-page.component.scss'
})
export class OpnameReviewPageComponent implements OnInit{
  sessionID: number = -1;
  opnameSession: OpnameSession = {} as OpnameSession;
  submittedUser: User & { fullName: string } = {} as User & { fullName: string }; // User who submitted the opname session
  loggedInUser: User & { fullName: string } = {} as User & { fullName: string }; // Currently logged-in user
  reviewerNames: { l1: string, manager: string } = { l1: '', manager: '' }; // Names of the reviewers
  opnameSite: SiteInfo = {} as SiteInfo;
  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';
 
  constructor(private apiService: ApiService, private opnameSessionService: OpnameSessionService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.isLoading = true;
    this.initSession();
    this.fetchLoggedInUser();
  }

  private initSession() {
    this.isLoading = true;
    const sessionIDParam = this.route.snapshot.paramMap.get('session-id');
    if (sessionIDParam) {
      this.sessionID = Number(sessionIDParam);
      console.log('[OpnameReviewPage] Session ID:', this.sessionID);

      this.opnameSessionService.getOpnameSession(this.sessionID).subscribe({
        next: (session) => {
          this.opnameSession = session;

          // Get the user and site details
          this.apiService.getUserByID(this.opnameSession.userID).subscribe({
            next: (user) => {
                this.submittedUser = { ...user, fullName: `${user.firstName} ${user.lastName}` };
            },
            error: (error) => {
              this.errorMessage = 'User tidak ditemukan: ' + error.message;
            },
            complete: () => {
              this.isLoading = false;
            }
          });

          this.apiService.getSiteByID(this.opnameSession.siteID).subscribe({
            next: (site) => {
              this.opnameSite = site;
            },
            error: (error) => {
              this.errorMessage = 'Site tidak ditemukan: ' + error.message;
            },
            complete: () => {
              this.isLoading = false;
            }
          });

          this.fetchReviewerNames();
        },
        error: (error) => {
          this.errorMessage = 'Sesi opname tidak ditemukan: ' + error.message;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    } else {
      this.errorMessage = 'Sesi opname tidak ditemukan';
      console.error('[OpnameReviewPage] Error:', this.errorMessage);
      this.isLoading = false;
    }
  }

  private fetchLoggedInUser() {
    this.apiService.getUserProfile('me').subscribe({
      next: (user) => {
        this.loggedInUser = { ...user, fullName: `${user.firstName} ${user.lastName}` };
      },
      error: (error) => {
        this.errorMessage = 'User tidak ditemukan: ' + error.message;
        console.error('[OpnameReviewPage] Error:', error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  private fetchReviewerNames() {
    let pendingRequests = 0;

    // Only fetch L1 reviewer if ID exists and is valid
    if (this.hasValidL1ReviewerID) {
      pendingRequests++;
      this.apiService.getUserByID(this.opnameSession.l1ReviewerID!).subscribe({
        next: (user) => {
          this.reviewerNames.l1 = `${user.firstName} ${user.lastName}`;
        },
        error: (error) => {
          this.errorMessage = 'L1 reviewer tidak ditemukan: ' + error.message;
          console.error('[OpnameReviewPage] Error:', error);
        },
        complete: () => {
          pendingRequests--;
          if (pendingRequests === 0) {
            this.isLoading = false;
          }
        }
      });
    }

    // Only fetch manager reviewer if ID exists and is valid
    if (this.hasValidManagerReviewerID) {
      pendingRequests++;
      this.apiService.getUserByID(this.opnameSession.managerReviewerID!).subscribe({
        next: (user) => {
          this.reviewerNames.manager = `${user.firstName} ${user.lastName}`;
        },
        error: (error) => {
          this.errorMessage = 'Manager reviewer tidak ditemukan: ' + error.message;
          console.error('[OpnameReviewPage] Error:', error);
        },
        complete: () => {
          pendingRequests--;
          if (pendingRequests === 0) {
            this.isLoading = false;
          }
        }
      });
    }

    // If no requests were made, set loading to false
    if (pendingRequests === 0) {
      this.isLoading = false;
    }
  }
  
  // Helper getters to check if reviewer IDs are valid
  private get hasValidL1ReviewerID(): boolean {
    return this.opnameSession.l1ReviewerID !== null && 
           this.opnameSession.l1ReviewerID !== undefined && 
           this.opnameSession.l1ReviewerID > 0;
  }

  private get hasValidManagerReviewerID(): boolean {
    return this.opnameSession.managerReviewerID !== null && 
           this.opnameSession.managerReviewerID !== undefined && 
           this.opnameSession.managerReviewerID > 0;
  }

  get isAlreadyApproved(): boolean {
    // An opname session is considered approved if its status is 'Verified' (approved by L1 support)
    // OR if it's 'Escalated' with a manager reviewer AND has been reviewed by L1 support as well
    return this.opnameSession.status === 'Verified' || 
           (this.opnameSession.status === 'Escalated' && this.hasValidManagerReviewerID && this.hasValidL1ReviewerID);
  }

  get isAlreadyRejected(): boolean {
    return this.opnameSession.status === 'Rejected';
  }

  get reviewedBy(): string {
    // Returns the name of the user who reviewed (either approve/reject) the opname session.
    // We check if the opnameSession has an l1ReviewerID first, then check for managerReviewerID.
    // Because if there's already an L1 reviewer, it means the session was already escalated to L1 support and thus reviewed by them.
    // Then, check if the logged in user is the one who reviewed the session.
    if (this.hasValidL1ReviewerID) {
      if (this.loggedInUser.userID === this.opnameSession.l1ReviewerID) {
        // If the logged-in user is the L1 reviewer, return 'You'
        return 'You';
      } else {
        // Return the L1 reviewer's full name with fallback to 'L1 Support'
        return this.reviewerNames.l1 || 'L1 Support';
      }
    } else if (this.hasValidManagerReviewerID) {
      if (this.loggedInUser.userID === this.opnameSession.managerReviewerID) {
        // If the logged-in user is the manager reviewer, return 'You'
        return 'You';
      } else {
        // Return the manager reviewer's full name with fallback to 'Area Manager'
        return this.reviewerNames.manager || 'Area Manager';
      }
    }

    return ''; // If no reviewers are set, return an empty string
  }

  get needsReview(): boolean {
    return !this.isAlreadyApproved && !this.isAlreadyRejected;
  }

  // TODO: Implement PDF download functionality
  downloadPDF() {}

  approveOpname() {
    this.isLoading = true;
    this.opnameSessionService.approveOpnameSession(this.sessionID).subscribe({
      next: (response) => {
        this.successMessage = 'Opname session approved successfully.';
        console.log('[OpnameReviewPage] Approval response:', response);
        // Refresh the session data to reflect the changes
        this.initSession();
      },
      error: (error) => {
        this.errorMessage = 'Gagal menyetujui sesi opname: ' + error.message;
        console.error('[OpnameReviewPage] Error:', error);
        this.isLoading = false;
      }
    });
  }

  rejectOpname() {
    this.isLoading = true;
    this.opnameSessionService.rejectOpnameSession(this.sessionID).subscribe({
      next: (response) => {
        this.successMessage = 'Opname session rejected successfully.';
        console.log('[OpnameReviewPage] Rejection response:', response);
        // Refresh the session data to reflect the changes
        this.initSession();
      },
      error: (error) => {
        this.errorMessage = 'Gagal menolak sesi opname: ' + error.message;
        console.error('[OpnameReviewPage] Error:', error);
        this.isLoading = false;
      }
    });
  }

  goToReport() {
    const reportURL = this.router.createUrlTree(['/site', this.opnameSession.siteID, 'report'], {
      queryParams: { session_id: this.sessionID }
    }).toString();

    window.open(reportURL, '_blank');
  }
}
