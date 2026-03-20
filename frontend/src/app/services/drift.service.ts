import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DriftDetail } from '../models/drift-detail';

@Injectable({
  providedIn: 'root'
})
export class DriftService {
  private readonly apiUrl = 'http://localhost:5138/api/drift';

  constructor(private http: HttpClient) {}

  getAll(): Observable<DriftDetail[]> {
    return this.http.get<DriftDetail[]>(this.apiUrl);
  }

  getById(id: number): Observable<DriftDetail> {
    return this.http.get<DriftDetail>(`${this.apiUrl}/${id}`);
  }

  create(drift: Omit<DriftDetail, 'id' | 'detectedAt'>): Observable<DriftDetail> {
    return this.http.post<DriftDetail>(this.apiUrl, drift);
  }

  update(drift: DriftDetail): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${drift.id}`, drift);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
