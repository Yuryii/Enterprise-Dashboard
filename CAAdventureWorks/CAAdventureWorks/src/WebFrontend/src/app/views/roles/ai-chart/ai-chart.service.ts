import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SavedChartDto {
  chartId: string;
  departmentId: string;
  name: string;
  chartSpecJson: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface SaveChartRequest {
  name: string;
  chartSpecJson: string;
  departmentId: string;
}

@Injectable({ providedIn: 'root' })
export class AiChartService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/ai-charts`;

  getSavedCharts(departmentId?: string): Observable<SavedChartDto[]> {
    let params = new HttpParams();
    if (departmentId) {
      params = params.set('departmentId', departmentId);
    }
    // #region agent instrumentation
    fetch('http://127.0.0.1:7896/ingest/d8ee6c7d-8844-4721-b9bc-1a1471f76f19',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0e7eba'},body:JSON.stringify({sessionId:'0e7eba',location:'ai-chart.service.ts:31',message:'getSavedCharts API CALL',data:{apiUrl:this.apiUrl,params:departmentId},timestamp:Date.now(),runId:'debug',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return this.http.get<SavedChartDto[]>(this.apiUrl, { params });
  }

  saveChart(request: SaveChartRequest): Observable<SavedChartDto> {
    // #region agent instrumentation
    fetch('http://127.0.0.1:7896/ingest/d8ee6c7d-8844-4721-b9bc-1a1471f76f19',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0e7eba'},body:JSON.stringify({sessionId:'0e7eba',location:'ai-chart.service.ts:37',message:'saveChart API CALL',data:{apiUrl:this.apiUrl,request},timestamp:Date.now(),runId:'debug',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return this.http.post<SavedChartDto>(this.apiUrl, request);
  }

  deleteChart(chartId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${chartId}`);
  }
}
