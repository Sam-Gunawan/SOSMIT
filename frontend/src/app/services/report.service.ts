import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { map, Observable } from "rxjs";
import { OpnameStats } from "../model/opname-stats.model";
import { environment } from "../../environments/environments";

@Injectable({ providedIn: 'root' })
export class ReportService {
  private reportApiUrl = `${environment.serverURL}/api/report`;

	constructor(private http: HttpClient) {}

	getOpnameStats(sessionID: number): Observable<OpnameStats> {
		return this.http.get<any>(`${this.reportApiUrl}/${sessionID}/stats`).pipe(
			map(response => ({
				sessionID: sessionID,
				workingAssets: response.working_assets,
				brokenAssets: response.broken_assets,
				misplacedAssets: response.misplaced_assets,
				missingAssets: response.missing_assets
			}))
		);
	}

	// Download BAP PDF for a session as Blob
	downloadBAPPdf(sessionID: number): Observable<Blob> {
		return this.http.get(`${this.reportApiUrl}/${sessionID}/bap.pdf`, { responseType: 'blob' });
	}

	setActionNotes(assetTag: string, sessionID: number, actionNotes: string): Observable<any> {
		return this.http.put(`${this.reportApiUrl}/action-notes/add`, { asset_tag: assetTag, session_id: sessionID, action_notes: actionNotes });
	}

	deleteActionNotes(assetTag: string, sessionID: number): Observable<any> {
		return this.http.delete(`${this.reportApiUrl}/action-notes/delete`, { body: { asset_tag: assetTag, session_id: sessionID } });
	}

	// (Optional future) fetch existing notes if endpoint added
	// getActionNotes(assetTag: string, sessionID: number): Observable<string> { ... }
}