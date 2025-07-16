import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { OpnameSession } from '../model/opname-session.model';
import { AssetChange } from '../model/asset-changes.model';
import { OpnameSessionProgress } from '../model/opname-session-progress.model';

@Injectable({ providedIn: 'root' })
export class OpnameSessionService {
  private sessionIDSubject = new BehaviorSubject<number | null>(null);
  public sessionID$ = this.sessionIDSubject.asObservable();
  private opnameApiUrl = 'http://localhost:8080/api/opname';

  constructor(private http: HttpClient) { }

  setSessionId(sessionID: number): void {
    // Set in BehaviorSubject
    this.sessionIDSubject.next(sessionID);
    // Store in localStorage for persistence
    localStorage.setItem('opname_session_id', sessionID.toString());
  }

  getSessionId(): number | null {
    // First try to get from BehaviorSubject (in-memory)
    let sessionId = this.sessionIDSubject.value;
    
    // If not available, try to get from localStorage
    if (sessionId === null) {
      const storedId = localStorage.getItem('opname_session_id');
      if (storedId) {
        sessionId = Number(storedId);
        // Update the BehaviorSubject with the retrieved value
        this.sessionIDSubject.next(sessionId);
      }
    }
    
    return sessionId;
  }

  clearSession(): void {
    // Clear from BehaviorSubject
    this.sessionIDSubject.next(null);
    // Clear from localStorage
    localStorage.removeItem('opname_session_id');
    this.clearSiteId(); // Also clear the site ID
  }

  // Store and retrieve siteID for the current opname session
  setSiteId(siteId: number): void {
    localStorage.setItem('opname_site_id', siteId.toString());
  }

  getSiteId(): number | null {
    const storedId = localStorage.getItem('opname_site_id');
    return storedId ? Number(storedId) : null;
  }

  clearSiteId(): void {
    localStorage.removeItem('opname_site_id');
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
    return this.http.post(`${this.opnameApiUrl}/start`, {site_id: siteID}).pipe(
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
    this.setSiteId(siteID);       // Also store the site ID
    router.navigate(['/site', siteID, 'opname'], {
        state: { sessionID: sessionID }
      });
  }

  processScannedAsset(sessionID: number, assetChanges: AssetChange): Observable<any> {
    // This method will process the newly scanned/searched asset in the opname session.
    console.log('[OpnameService] Processing scanned asset:', assetChanges);

    // Mapping the request body to match the expected API format, which is using snake_case instead of camelCase.
    const payload = {
      asset_tag: assetChanges.assetTag,
      new_status: assetChanges.newStatus,
      new_status_reason: assetChanges.newStatusReason,
      new_condition: assetChanges.newCondition,
      new_condition_notes: assetChanges.newConditionNotes,
      new_condition_photo_url: assetChanges.newConditionPhotoURL,
      new_location: assetChanges.newLocation,
      new_room: assetChanges.newRoom,
      new_owner_id: assetChanges.newOwnerID,
      new_site_id: assetChanges.newSiteID,
      change_reason: assetChanges.changeReason,
    }

    return this.http.post<JSON>(`${this.opnameApiUrl}/${sessionID}/process-asset`, payload).pipe(
      map((response: any) => {
        return {
          message: response.message,
          assetChanges: JSON.parse(response.changes || '{}'),
        };
      }),
      tap((response: any) => {
        // Log the response for debugging purposes.
        console.log('[OpnameService] Processed scanned asset:', response);
      })
    )
  }

  removeAssetFromSession(sessionID: number, assetTag: string): Observable<any> {
    // This method will remove an asset from the current opname session.
    console.log('[OpnameService] Removing asset from session:', assetTag);
    return this.http.delete(`${this.opnameApiUrl}/${sessionID}/remove-asset`, {body: {asset_tag: assetTag}}).pipe(
      tap((response: any) => {
        // Log the response for debugging purposes.
        console.log('[OpnameService] Removed asset from session:', response);
      })
    );
  }

  loadOpnameProgress(sessionID: number): Observable<OpnameSessionProgress[]> {
    // This method will load the progress of the current opname session.
    console.log('[OpnameService] Loading opname progress for session:', sessionID);
    return this.http.get(`${this.opnameApiUrl}/${sessionID}/load-progress`).pipe(
      map((response: any): OpnameSessionProgress[] => {
        // Handle the new response structure with progress array
        if (response.progress && Array.isArray(response.progress)) {
          // Sort by id descending before mapping
          const sortedProgress = response.progress.sort((a: any, b: any) => b.id - a.id);
          return sortedProgress.map((progressItem: any): OpnameSessionProgress => {
            // Parse the changes JSON string back to an object
            const changes = JSON.parse(progressItem.changes || '{}');
            return {
              id: progressItem.id,
              assetTag: progressItem.asset_tag,
              assetChanges: {
              newStatus: changes.newStatus,
              newStatusReason: changes.newStatusReason,
              newCondition: changes.newCondition,
              newConditionNotes: changes.newConditionNotes,
              newConditionPhotoURL: changes.newConditionPhotoURL,
              newLocation: changes.newLocation,
              newRoom: changes.newRoom,
              newOwnerID: changes.newOwnerID,
              newSiteID: changes.newSiteID,
              changeReason: progressItem.change_reason
              }
            };
          })
        }

        return []; // Return empty array if no progress found
      }),
      tap((response: OpnameSessionProgress[]) => {
        // Log the response for debugging purposes.
        console.log('[OpnameService] Loaded opname progress:', response);
      })
    );
  }
}