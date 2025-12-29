import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GitHubConnectionStatus {
  connected: boolean;
  username?: string;
  message: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  has_pages?: boolean;
}

export interface PublishResult {
  success: boolean;
  message: string;
  repository?: {
    name: string;
    url: string;
    clone_url: string;
  };
  pages?: {
    url: string;
    message: string;
  };
  uploadResults?: Array<{
    file: string;
    success: boolean;
    error?: string;
  }>;
  jobId?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GitHubPublishService {
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

  async checkGitHubConnection(): Promise<GitHubConnectionStatus> {
    try {
      const response = await this.http.get<GitHubConnectionStatus>(
        `${this.apiUrl}/github/status`,
        { headers: this.getAuthHeaders() }
      ).toPromise();

      return response!;
    } catch (error: any) {
      return {
        connected: false,
        message: 'Failed to check connection: ' + (error.error?.message || error.message)
      };
    }
  }

  async publishCVSite(jobId: string, repoName?: string, isPrivate: boolean = false): Promise<PublishResult> {
    try {
      // The backend endpoint already does everything automatically:
      // 1. Creates repository with auto-generated name
      // 2. Uploads all CV site files (index.html, styles.css, script.js, data.js, README.md)  
      // 3. Enables GitHub Pages automatically
      // 4. Returns live site URL and repository URL
      const response = await this.http.post<PublishResult>(
        `${this.apiUrl}/github/test-push-cv`,
        {
          jobId: jobId,
          repoName: repoName || undefined,
          private: isPrivate
        },
        { headers: this.getAuthHeaders() }
      ).toPromise();

      return response!;
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to publish CV site: ' + (error.error?.error || error.message),
        error: error.error?.error || error.message
      };
    }
  }

  async listRepositories(): Promise<GitHubRepository[]> {
    try {
      const response = await this.http.get<GitHubRepository[]>(
        `${this.apiUrl}/github/repositories`,
        { headers: this.getAuthHeaders() }
      ).toPromise();

      return response || [];
    } catch (error: any) {
      console.error('Failed to fetch repositories:', error);
      return [];
    }
  }

  async createRepository(name: string, isPrivate: boolean = false, description?: string): Promise<any> {
    try {
      const response = await this.http.post(
        `${this.apiUrl}/github/create-repository`,
        {
          name: name.trim(),
          private: isPrivate,
          description: description || 'Repository created via CV Landing Generator'
        },
        { headers: this.getAuthHeaders() }
      ).toPromise();

      return response;
    } catch (error: any) {
      throw new Error(error.error?.error || error.message || 'Failed to create repository');
    }
  }

  async uploadTestFiles(repository: string): Promise<any> {
    try {
      const response = await this.http.post(
        `${this.apiUrl}/github/upload-test-files`,
        { repository },
        { headers: this.getAuthHeaders() }
      ).toPromise();

      return response;
    } catch (error: any) {
      throw new Error(error.error?.error || error.message || 'Failed to upload test files');
    }
  }

  async enableGitHubPages(repository: string): Promise<any> {
    try {
      const response = await this.http.post(
        `${this.apiUrl}/github/enable-pages`,
        { repository },
        { headers: this.getAuthHeaders() }
      ).toPromise();

      return response;
    } catch (error: any) {
      throw new Error(error.error?.error || error.message || 'Failed to enable GitHub Pages');
    }
  }

  getGitHubAuthUrl(returnUrl?: string): string {
    console.log('=== GITHUB AUTH URL GENERATION ===');
    console.log('getGitHubAuthUrl called with returnUrl:', returnUrl);

    const user = this.authService.getUser();
    console.log('User from auth service:', user);

    if (!user) {
      console.error('No user found in auth service');
      throw new Error('User not logged in');
    }

    if (!user.id) {
      console.error('User has no ID:', user);
      throw new Error('User ID is missing');
    }

    // Handle popup mode vs redirect mode
    const finalReturnUrl = returnUrl === 'popup' ? 'popup' : (returnUrl || window.location.pathname);
    console.log('Final return URL:', finalReturnUrl);
    console.log('API URL:', this.apiUrl);
    console.log('User ID:', user.id);

    // For popup windows, we need an absolute URL
    // If apiUrl is relative (starts with /), prepend the current origin
    let baseUrl = this.apiUrl;
    if (baseUrl.startsWith('/')) {
      baseUrl = window.location.origin + baseUrl;
      console.log('Converted relative API URL to absolute:', baseUrl);
    }

    const authUrl = `${baseUrl}/github/auth?userId=${user.id}&returnUrl=${encodeURIComponent(finalReturnUrl)}`;
    console.log('Generated auth URL:', authUrl);
    console.log('=== GITHUB AUTH URL GENERATION END ===');

    return authUrl;
  }

  async checkSiteStatus(siteUrl: string): Promise<{live: boolean, status: number | null, message: string}> {
    try {
      const response = await this.http.post<{live: boolean, status: number | null, message: string}>(
        `${this.apiUrl}/github/check-site-status`,
        { siteUrl },
        { headers: this.getAuthHeaders() }
      ).toPromise();

      return response!;
    } catch (error: any) {
      return {
        live: false,
        status: null,
        message: 'Failed to check site status: ' + (error.error?.message || error.message)
      };
    }
  }

  isGitHubConnected(): boolean {
    const user = this.authService.getUser();
    return !!(user && (user as any).github_username);
  }
}