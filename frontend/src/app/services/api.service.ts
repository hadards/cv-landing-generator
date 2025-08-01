import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HealthResponse {
  status: string;
  message: string;
  timestamp: string;
  version: string;
}

export interface TestResponse {
  message: string;
  requestMethod: string;
  queryParams: any;
  requestBody: any;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  checkHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.apiUrl}/health`);
  }

  testGet(params?: any): Observable<TestResponse> {
    return this.http.get<TestResponse>(`${this.apiUrl}/test`, { params });
  }

  testPost(data: any): Observable<TestResponse> {
    return this.http.post<TestResponse>(`${this.apiUrl}/test`, data);
  }
}