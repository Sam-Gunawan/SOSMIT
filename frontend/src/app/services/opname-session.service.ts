import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { OpnameSession } from '../model/opname-session.model';

@Injectable({ providedIn: 'root' })
export class OpnameSessionService {
  private sessionIDSubject = new BehaviorSubject<number | null>(null);
  public sessionID$ = this.sessionIDSubject.asObservable();
  private opnameApiUrl = 'http://localhost:8080/api/opname';

  constructor(private http: HttpClient) { }

  setSessionId(sessionID: number): void {
    this.sessionIDSubject.next(sessionID);
  }

  getSessionId(): number | null {
    return this.sessionIDSubject.value;
  }

  clearSession(): void {
    this.sessionIDSubject.next(null);
  }

  getOpnameSession(sessionID: number): Observable<any> {
    // This method will fetch the current stock opname session for the specified site.
    return this.http.get<OpnameSession>(`${this.opnameApiUrl}/${sessionID}`).pipe(
        map((response: any) => {
            return {
              sessionID: response.session_id,
              siteID: response.site_id,
              userID: response.user_id,
              status: response.status,
              startDate: response.start_date,
              endDate: response.end_date || null, // Handle optional end date
              approverID: response.approver_id || null // Handle optional approver ID
            };
        }),
        tap((response: any) => {
            // Log the response for debugging purposes.
            console.log('[OpnameService] Fetched current opname session:', response);
        })
    );
  }

  startNewOpname(siteID: number): Observable<any> {
    // This method will start a new stock opname session for the specified site.
    return this.http.post(`${this.opnameApiUrl}/${siteID}/start`, {}).pipe(
        map((response: any) => {
            return {
            opnameSessionID: response.session_id,
            }
        }),

      tap((response: any) => {
          // Log the response for debugging purposes.
          console.log('[OpnameService] Started new opname session:', response);
      })
    )
  }

  cancelOpnameSession(sessionID: number): Observable<any> {
      // This method will cancel an existing opname session.
      return this.http.delete(`${this.opnameApiUrl}/${sessionID}/cancel`).pipe(
          tap((response: any) => {
              // Log the response for debugging purposes.
              console.log('[OpnameService] Cancelled opname session:', response);
          })
      );
  }

  continueOpname(sessionID: number, siteID: number, router: Router): void {
    // This method will continue an existing stock opname session.
    console.log('[OpnameService] Continuing opname session:', sessionID);
    this.setSessionId(sessionID); // Ensure the session ID is set in the service
    router.navigate(['/site', siteID, 'opname'], {
        state: { sessionID: sessionID }
      });
  }
}
