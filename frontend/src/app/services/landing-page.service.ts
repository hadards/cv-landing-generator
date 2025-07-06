import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface GenerationResult {
  success: boolean;
  message: string;
  generation: {
    id: string;
    userId: string;
    outputDir: string;
    generatedAt: string;
    files: string[];
    cvData: any;
  };
  previewUrl: string;
}

export interface PreviewResult {
  success: boolean;
  message: string;
  previewId: string;
}

@Injectable({
  providedIn: 'root'
})
export class LandingPageService {
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

  generateLandingPage(structuredData: any): Observable<GenerationResult> {
    const headers = this.getAuthHeaders();
    return this.http.post<GenerationResult>(`${this.apiUrl}/cv/generate`, 
      { structuredData }, 
      { headers }
    );
  }

  getPreview(previewId: string): Observable<PreviewResult> {
    return this.http.get<PreviewResult>(`${this.apiUrl}/cv/preview?previewId=${previewId}`);
  }
}