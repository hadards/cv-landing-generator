import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface PreviewResponse {
  success: boolean;
  message: string;
  previewId: string;
  generatedAt: string;
  files: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PreviewService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getPreview(previewId: string): Observable<PreviewResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<PreviewResponse>(`${this.apiUrl}/cv/preview?previewId=${previewId}`, { headers });
  }

  downloadWebsite(generationId: string): Observable<Blob> {
    const headers = this.getAuthHeaders();
    headers.delete('Content-Type'); // Remove content-type for blob response
    
    return this.http.get(`${this.apiUrl}/cv/download?generationId=${generationId}`, {
      headers,
      responseType: 'blob'
    });
  }
}