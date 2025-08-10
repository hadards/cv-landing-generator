// File: frontend/src/app/services/legal.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LegalDocument {
  filename: string;
  title: string;
  lastUpdated: string | null;
  content: string;
  html: string;
}

export interface LegalDocumentResponse {
  success: boolean;
  document?: LegalDocument;
  error?: string;
  message?: string;
}

export interface LegalSummary {
  success: boolean;
  documents: Array<{
    type: string;
    title: string;
    lastUpdated: string | null;
    endpoint: string;
  }>;
  experimental: boolean;
  freeTier: boolean;
  lastUpdated: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class LegalService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get Terms of Service
   */
  getTermsOfService(): Observable<LegalDocumentResponse> {
    return this.http.get<LegalDocumentResponse>(`${this.apiUrl}/legal/terms`);
  }

  /**
   * Get Privacy Policy
   */
  getPrivacyPolicy(): Observable<LegalDocumentResponse> {
    return this.http.get<LegalDocumentResponse>(`${this.apiUrl}/legal/privacy`);
  }

  /**
   * Get Service Disclaimer
   */
  getDisclaimer(): Observable<LegalDocumentResponse> {
    return this.http.get<LegalDocumentResponse>(`${this.apiUrl}/legal/disclaimer`);
  }

  /**
   * Get legal documents summary
   */
  getLegalSummary(): Observable<LegalSummary> {
    return this.http.get<LegalSummary>(`${this.apiUrl}/legal/summary`);
  }

  /**
   * Check if user has accepted current terms
   */
  hasAcceptedTerms(): boolean {
    const acceptance = localStorage.getItem('terms_accepted');
    if (!acceptance) return false;

    try {
      const data = JSON.parse(acceptance);
      const acceptedDate = new Date(data.date);
      const now = new Date();
      
      // Terms acceptance expires after 1 year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      
      return acceptedDate > oneYearAgo && data.version === this.getCurrentTermsVersion();
    } catch {
      return false;
    }
  }

  /**
   * Accept terms and conditions
   */
  acceptTerms(): void {
    const acceptance = {
      date: new Date().toISOString(),
      version: this.getCurrentTermsVersion(),
      userAgent: navigator.userAgent
    };
    
    localStorage.setItem('terms_accepted', JSON.stringify(acceptance));
  }

  /**
   * Get current terms version (based on date)
   */
  private getCurrentTermsVersion(): string {
    return '2025-08-10'; // Update this when terms change
  }

  /**
   * Clear terms acceptance (for testing or user logout)
   */
  clearTermsAcceptance(): void {
    localStorage.removeItem('terms_accepted');
  }

  /**
   * Get acceptance details
   */
  getAcceptanceDetails(): any {
    const acceptance = localStorage.getItem('terms_accepted');
    if (!acceptance) return null;

    try {
      return JSON.parse(acceptance);
    } catch {
      return null;
    }
  }
}