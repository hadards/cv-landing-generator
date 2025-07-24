// frontend/src/app/components/github-test/github-test.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-github-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="card max-w-4xl mx-auto">
        <h2 class="text-3xl font-bold text-gray-900 mb-8">GitHub Integration Test</h2>
        
        <!-- Console Messages -->
        <div class="mb-8 p-4 bg-gray-900 rounded-lg">
          <h3 class="text-white font-semibold mb-4">Console Messages:</h3>
          <div class="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
            <div *ngFor="let log of logs">
              <span [ngClass]="{
                'text-red-400': log.type === 'error',
                'text-yellow-400': log.type === 'warning', 
                'text-green-400': log.type === 'success',
                'text-blue-400': log.type === 'info'
              }">
                [{{ log.timestamp }}] {{ log.message }}
              </span>
            </div>
          </div>
        </div>

        <!-- Connection Status -->
        <div class="mb-8 p-4 border rounded-lg" [ngClass]="{
          'bg-green-50 border-green-200': githubConnected,
          'bg-gray-50 border-gray-200': !githubConnected
        }">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="w-3 h-3 rounded-full mr-3" [ngClass]="{
                'bg-green-500': githubConnected,
                'bg-gray-400': !githubConnected
              }"></div>
              <span class="font-medium">
                {{ githubConnected ? 'GitHub Connected' : 'GitHub Not Connected' }}
              </span>
            </div>
            <span *ngIf="githubUsername" class="text-sm text-gray-600">
              {{ githubUsername }}
            </span>
          </div>
        </div>

        <!-- OAuth URL Display -->
        <div *ngIf="oauthUrl && !githubConnected" class="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 class="font-semibold text-blue-900 mb-2">GitHub Authentication Required</h4>
          <p class="text-blue-800 text-sm mb-4">
            Click the link below to authenticate with GitHub (opens in new tab):
          </p>
          <a [href]="oauthUrl" 
             target="_blank"
             class="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-4">
            Authenticate with GitHub
          </a>
          <p class="text-xs text-blue-600 mb-3">
            After authentication, return here and click "Check Connection"
          </p>
          <button (click)="checkConnection()"
                  class="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200">
            Check Connection
          </button>
        </div>

        <!-- URL Parameters Debug -->
        <div *ngIf="urlParams.code || urlParams.github_connected" class="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 class="font-semibold text-yellow-800 mb-2">OAuth Callback Detected</h4>
          <pre class="text-xs text-yellow-700">{{ formatJson(urlParams) }}</pre>
        </div>

        <!-- Test Buttons -->
        <div class="space-y-4">
          <h3 class="font-semibold text-gray-900 mb-4">Quick Tests:</h3>
          
          <button (click)="testEnvironment()"
                  [disabled]="loading"
                  class="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {{ loading ? 'Testing...' : '1. Test Environment Variables' }}
          </button>
          
          <button (click)="generateAuthUrl()"
                  [disabled]="loading"
                  class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {{ loading ? 'Generating...' : '2. Generate GitHub Auth URL' }}
          </button>
          
          <button (click)="testRepoCreation()"
                  [disabled]="loading || !githubConnected"
                  class="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            {{ loading ? 'Creating Repository...' : '3. Test Repository Creation' }}
          </button>

          <button (click)="clearLogs()"
                  class="w-full px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
            Clear Console
          </button>
        </div>

        <!-- Error Display -->
        <div *ngIf="error" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 class="font-semibold text-red-800 mb-2">Error:</h4>
          <p class="text-red-700">{{ error }}</p>
        </div>
      </div>
    </div>
  `
})
export class GithubTestComponent implements OnInit {
  logs: Array<{timestamp: string, message: string, type: string}> = [];
  githubConnected = false;
  githubUsername = '';
  loading = false;
  oauthUrl = '';
  error = '';
  urlParams: any = {};

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.log('GitHub Test Component initialized', 'info');
    this.checkUrlParams();
    this.checkConnection();
  }

  private log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.push({ timestamp, message, type });
    console.log(`[${timestamp}] ${message}`);
    
    setTimeout(() => {
      const consoleDiv = document.querySelector('.max-h-64');
      if (consoleDiv) {
        consoleDiv.scrollTop = consoleDiv.scrollHeight;
      }
    }, 100);
  }

  private checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    this.urlParams = {
      github_connected: urlParams.get('github_connected'),
      github_error: urlParams.get('github_error'),
      code: urlParams.get('code'),
      state: urlParams.get('state'),
      username: urlParams.get('username')
    };

    if (this.urlParams.github_connected === 'true') {
      this.githubConnected = true;
      this.githubUsername = this.urlParams.username || '';
      this.log('GitHub OAuth callback successful!', 'success');
      if (this.urlParams.username) {
        this.log('Connected as: ' + this.urlParams.username, 'info');
      }
    } else if (this.urlParams.github_error === 'true') {
      this.log('GitHub OAuth callback failed!', 'error');
    } else if (this.urlParams.code) {
      this.log('GitHub OAuth code received, processing...', 'info');
    }
  }

  async testEnvironment() {
    this.loading = true;
    this.error = '';
    this.log('Testing environment variables...', 'info');

    try {
      const response = await this.http.get<any>('http://localhost:3000/api/github/test?userId=1').toPromise();
      
      if (response && response.success) {
        this.log('Environment variables configured correctly', 'success');
        this.log('Client ID: ' + (response.environment?.clientId || 'Not found'), 'info');
        this.log('Redirect URI: ' + (response.environment?.redirectUri || 'Not found'), 'info');
        this.log('GitHub API accessible: ' + (response.githubApi?.accessible || false), 'info');
      } else {
        this.log('Environment test failed', 'error');
        this.error = response?.error || 'Environment test failed';
      }
    } catch (error: any) {
      this.log('Environment test request failed', 'error');
      this.error = error.message || 'Request failed';
      this.log('Error details: ' + this.error, 'error');
    } finally {
      this.loading = false;
    }
  }

  async generateAuthUrl() {
    this.loading = true;
    this.error = '';
    this.log('Generating GitHub authentication URL...', 'info');

    try {
      const response = await this.http.post<any>('http://localhost:3000/api/github/connect', { 
        userId: '1' 
      }).toPromise();
      
      if (response && response.success && response.oauthUrl) {
        this.oauthUrl = response.oauthUrl;
        this.log('GitHub OAuth URL generated successfully', 'success');
        this.log('OAuth URL ready - click the link above to authenticate', 'info');
        this.log('Important: Return to this page after GitHub authentication', 'warning');
      } else {
        this.log('Failed to generate OAuth URL', 'error');
        this.error = response?.error || 'OAuth URL generation failed';
      }
    } catch (error: any) {
      this.log('OAuth URL generation request failed', 'error');
      this.error = error.message || 'Request failed';
      this.log('Error details: ' + this.error, 'error');
    } finally {
      this.loading = false;
    }
  }

  async checkConnection() {
    this.log('Checking GitHub connection status...', 'info');

    try {
      const response = await this.http.get<any>('http://localhost:3000/api/sites/list?userId=1').toPromise();
      
      if (response && response.hasGitHubConnection) {
        this.githubConnected = true;
        this.log('GitHub connection verified!', 'success');
      } else {
        this.githubConnected = false;
        this.log('No GitHub connection found', 'warning');
      }
    } catch (error: any) {
      this.log('Failed to check GitHub connection', 'error');
      this.log('Connection check error: ' + error.message, 'error');
    }
  }

  async testRepoCreation() {
    this.loading = true;
    this.error = '';
    this.log('Testing GitHub repository creation...', 'info');

    try {
      const testRepoName = 'test-repo-' + Date.now();
      this.log('Creating repository: ' + testRepoName, 'info');
      
      const response = await this.http.post<any>('http://localhost:3000/api/cv/deploy', {
        userId: '1',
        siteName: testRepoName,
        cvData: {
          personalInfo: { name: 'Test User', email: 'test@example.com' },
          summary: 'This is a test deployment',
          experience: [],
          education: [],
          skills: ['Testing'],
          projects: [],
          certifications: []
        }
      }).toPromise();
      
      if (response && response.githubUrl) {
        this.log('Test repository created successfully!', 'success');
        this.log('Repository URL: ' + response.githubUrl, 'info');
        this.log('Live URL: ' + response.pagesUrl, 'info');
      } else {
        this.log('Repository creation failed', 'error');
        this.error = 'No repository URL returned';
      }
    } catch (error: any) {
      this.log('Repository creation test failed', 'error');
      this.error = error.error?.error || error.message || 'Repository creation failed';
      this.log('Error details: ' + this.error, 'error');
    } finally {
      this.loading = false;
    }
  }

  clearLogs() {
    this.logs = [];
    this.error = '';
    this.log('Console cleared', 'info');
  }

  formatJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }
}