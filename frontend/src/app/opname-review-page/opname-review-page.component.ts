import { Component, OnInit } from '@angular/core';
import { OpnameSessionService } from '../services/opname-session.service';
import { ActivatedRoute, Router } from '@angular/router';
import { OpnameSession } from '../model/opname-session.model';

@Component({
  selector: 'app-opname-review-page',
  imports: [],
  templateUrl: './opname-review-page.component.html',
  styleUrl: './opname-review-page.component.scss'
})
export class OpnameReviewPageComponent implements OnInit{
  sessionID: number = -1;
  opnameSession: OpnameSession = {} as OpnameSession;
  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';
 
  constructor(private opnameSessionService: OpnameSessionService, private route: ActivatedRoute, private router: Router) {}

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
        },
        error: (error) => {
          this.errorMessage = 'Error fetching opname session: ' + error.message;
        },
      });

    } else {
      this.errorMessage = 'Session ID not found in the route parameters.';
      console.error('[OpnameReviewPage] Error:', this.errorMessage);
    }

    this.isLoading = false;
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
