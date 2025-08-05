// File: frontend/src/app/services/landing-page.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

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
  private apiUrl = environment.apiUrl;

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
    
    // Prepare the data - prioritize edited content over original structured data
    const dataForGeneration = this.prepareDataForGeneration(structuredData);
    
    console.log('Sending to API - Data includes edited content:', {
      hasEditedExperience: !!dataForGeneration.experienceText,
      hasEditedSkills: !!dataForGeneration.skillsText,
      hasEditedEducation: !!dataForGeneration.educationText,
      hasEditedProjects: !!dataForGeneration.projectsText,
      hasEditedCertifications: !!dataForGeneration.certificationsText,
      summaryLength: dataForGeneration.personalInfo?.summary?.length,
      aboutMeLength: dataForGeneration.personalInfo?.aboutMe?.length
    });
    
    return this.http.post<GenerationResult>(`${this.apiUrl}/cv/generate`, 
      { structuredData: dataForGeneration }, 
      { headers }
    );
  }

  private prepareDataForGeneration(originalData: any) {
    // Start with original data structure
    const preparedData = {
      ...originalData,
      personalInfo: {
        ...originalData.personalInfo
      }
    };

    // Add flags to indicate we have edited content that should override structured data
    preparedData._hasEditedContent = true;
    
    // The text fields (experienceText, skillsText, etc.) are already in the data
    // from buildFinalCVDataFromEditedSections()
    
    console.log('Data prepared for generation with edited content flags');
    return preparedData;
  }

  getPreview(previewId: string): Observable<PreviewResult> {
    return this.http.get<PreviewResult>(`${this.apiUrl}/cv/preview?previewId=${previewId}`);
  }
}