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
}