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
  submittedUser: User & { fullName: any } = {} as User & { fullName: any }; // User who submitted the opname session
  opnameSite: SiteInfo = {} as SiteInfo;
  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';
 
  constructor(private apiService: ApiService, private opnameSessionService: OpnameSessionService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.initSession();
  }

  initSession() {
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
              this.errorMessage = 'Error fetching user details: ' + error.message;
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
              this.errorMessage = 'Error fetching site details: ' + error.message;
            },
            complete: () => {
              this.isLoading = false;
            }
          });
        },
        error: (error) => {
          this.errorMessage = 'Error fetching opname session: ' + error.message;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    } else {
      this.errorMessage = 'Session ID not found in the route parameters.';
      console.error('[OpnameReviewPage] Error:', this.errorMessage);
      this.isLoading = false;
    }
  }

  approveOpname() {
    this.isLoading = true;
    this.opnameSessionService.approveOpnameSession(this.sessionID).subscribe({
      next: (response) => {
        this.successMessage = 'Opname session approved successfully.';
        console.log('[OpnameReviewPage] Approval response:', response);
      },
      error: (error) => {
        this.errorMessage = 'Error approving opname session: ' + error.message;
        console.error('[OpnameReviewPage] Error:', error);
      },
      complete: () => {
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
      },
      error: (error) => {
        this.errorMessage = 'Error rejecting opname session: ' + error.message;
        console.error('[OpnameReviewPage] Error:', error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  goToReport() {
    this.router.navigate(['/site', this.opnameSession.siteID, `report?session_id=${this.sessionID}`]);
  }
}
