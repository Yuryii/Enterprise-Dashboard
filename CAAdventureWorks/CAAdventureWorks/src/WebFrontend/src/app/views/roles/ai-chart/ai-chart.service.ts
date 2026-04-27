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
    return this.http.get<SavedChartDto[]>(this.apiUrl, { params });
  }

  saveChart(request: SaveChartRequest): Observable<SavedChartDto> {
    return this.http.post<SavedChartDto>(this.apiUrl, request);
  }

  deleteChart(chartId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${chartId}`);
  }
}
