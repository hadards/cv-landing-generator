import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { GitHubPublishService, GitHubConnectionStatus, GitHubRepository, PublishResult } from '../../services/github-publish.service';


interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  timestamp: string;
}

@Component({
  selector: 'app-github-debug',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="github-debug-container">
      <div class="debug-header">
        <h1>GitHub Integration Debug Dashboard</h1>
        <p>Test GitHub API operations before integrating with CV generation</p>
      </div>

      <!-- Authentication Status -->
      <div class="status-section">
        <h2>Authentication Status</h2>
        <div class="status-card" [ngClass]="{'connected': authService.isLoggedIn(), 'disconnected': !authService.isLoggedIn()}">
          <div class="status-indicator">
            <span class="status-dot" [ngClass]="{'green': authService.isLoggedIn(), 'red': !authService.isLoggedIn()}"></span>
            <span class="status-text">
              {{ authService.isLoggedIn() ? 'Logged In' : 'Not Logged In' }}
            </span>
          </div>
          <div *ngIf="authService.getUser() as user" class="username">
            User: <strong>{{ user.name }} ({{ user.email }})</strong>
          </div>
          <div *ngIf="!authService.isLoggedIn()" class="status-message">
            Please <a href="/login" class="text-blue-600 hover:underline">login first</a> to test GitHub integration.
          </div>
        </div>
      </div>

      <!-- GitHub Connection Status -->
      <div class="status-section">
        <h2>GitHub Connection Status</h2>
        <div class="status-card" [ngClass]="{'connected': connectionStatus?.connected, 'disconnected': !connectionStatus?.connected}">
          <div class="status-indicator">
            <span class="status-dot" [ngClass]="{'green': connectionStatus?.connected, 'red': !connectionStatus?.connected}"></span>
            <span class="status-text">
              {{ connectionStatus?.connected ? 'Connected to GitHub' : 'Not Connected' }}
            </span>
          </div>
          <p class="status-message">{{ connectionStatus?.message }}</p>
          <div *ngIf="connectionStatus?.username" class="username">
            Logged in as: <strong>{{ connectionStatus?.username }}</strong>
          </div>
        </div>
        
        <div class="auth-buttons">
          <button class="btn btn-primary" (click)="connectToGitHub()" [disabled]="isLoading">
            {{ connectionStatus?.connected ? 'Reconnect' : 'Connect to GitHub' }}
          </button>
          <button class="btn btn-secondary" (click)="checkConnection()" [disabled]="isLoading">
            Check Status
          </button>
        </div>
      </div>

      <!-- Repository Operations -->
      <div class="operations-section">
        <h2>📁 Repository Operations</h2>
        
        <div class="operation-group">
          <h3>List Repositories</h3>
          <button class="btn btn-outline" (click)="listRepositories()" [disabled]="isLoading || !connectionStatus?.connected">
            📋 Get My Repositories
          </button>
          
          <div *ngIf="repositories.length > 0" class="repos-list">
            <h4>Found {{ repositories.length }} repositories:</h4>
            <div class="repo-item" *ngFor="let repo of repositories">
              <div class="repo-info">
                <strong>{{ repo.name }}</strong>
                <span class="repo-type">{{ repo.private ? '🔒 Private' : '🌍 Public' }}</span>
                <span *ngIf="repo.has_pages" class="pages-enabled">📄 Pages Enabled</span>
              </div>
              <a [href]="repo.html_url" target="_blank" class="repo-link">View on GitHub</a>
            </div>
          </div>
        </div>

        <div class="operation-group">
          <h3>Create Test Repository</h3>
          <div class="form-group">
            <input 
              type="text" 
              [(ngModel)]="newRepoName" 
              placeholder="Enter repository name (e.g., 'test-cv-site')"
              class="form-input">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="makeRepoPrivate">
              Make repository private
            </label>
          </div>
          <button 
            class="btn btn-success" 
            (click)="createRepository()" 
            [disabled]="isLoading || !connectionStatus?.connected || !newRepoName">
            Create Repository
          </button>
        </div>

        <div class="operation-group">
          <h3>Test File Upload</h3>
          <div class="form-group">
            <select [(ngModel)]="selectedRepo" class="form-select">
              <option value="">Select a repository...</option>
              <option [value]="repo.name" *ngFor="let repo of repositories">{{ repo.name }}</option>
            </select>
          </div>
          <button 
            class="btn btn-warning" 
            (click)="uploadTestFiles()" 
            [disabled]="isLoading || !connectionStatus?.connected || !selectedRepo">
            📤 Upload Test HTML Files
          </button>
        </div>

        <div class="operation-group">
          <h3>GitHub Pages</h3>
          <button 
            class="btn btn-info" 
            (click)="enableGitHubPages()" 
            [disabled]="isLoading || !connectionStatus?.connected || !selectedRepo">
            🌐 Enable GitHub Pages
          </button>
        </div>

        <div class="operation-group">
          <h3>Test CV Site Push</h3>
          <div class="form-group">
            <select [(ngModel)]="selectedJobId" class="form-select">
              <option value="">Select a generated CV...</option>
              <option [value]="job.id" *ngFor="let job of availableJobs">{{ job.name }} ({{ job.id }})</option>
            </select>
            <small class="form-hint">Choose a CV that has been generated to test pushing to GitHub</small>
          </div>
          <div class="form-group">
            <input 
              type="text" 
              [(ngModel)]="testPushRepoName" 
              placeholder="Repository name (optional - auto-generated if empty)"
              class="form-input">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="testPushPrivate">
              Make test repository private
            </label>
          </div>
          <button 
            class="btn btn-primary" 
            (click)="testPushCVSite()" 
            [disabled]="isLoading || !connectionStatus?.connected || !selectedJobId">
            Test Push CV Site
          </button>
        </div>
      </div>

      <!-- Test Results -->
      <div class="results-section">
        <h2>📊 Test Results</h2>
        <div class="results-container">
          <div *ngIf="testResults.length === 0" class="no-results">
            No tests run yet. Use the buttons above to test GitHub operations.
          </div>
          
          <div *ngFor="let result of testResults; let i = index" 
               class="result-item" 
               [ngClass]="{'success': result.success, 'error': !result.success}">
            <div class="result-header">
              <span class="result-icon">{{ result.success ? 'SUCCESS' : 'FAILED' }}</span>
              <span class="result-timestamp">{{ result.timestamp | date:'medium' }}</span>
            </div>
            <div class="result-message">{{ result.message }}</div>
            <div *ngIf="result.data" class="result-data">
              <pre>{{ result.data | json }}</pre>
            </div>
          </div>
        </div>
        
        <button *ngIf="testResults.length > 0" 
                class="btn btn-secondary clear-btn" 
                (click)="clearResults()">
          🗑️ Clear Results
        </button>
      </div>

      <!-- Loading Overlay -->
      <div *ngIf="isLoading" class="loading-overlay">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>{{ loadingMessage || 'Processing...' }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .github-debug-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .debug-header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #24292e 0%, #2d333b 100%);
      color: white;
      border-radius: 10px;
    }

    .debug-header h1 {
      margin: 0 0 10px 0;
      font-size: 2.5em;
    }

    .status-section, .operations-section, .results-section {
      margin-bottom: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .status-card {
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      transition: all 0.3s ease;
    }

    .status-card.connected {
      background: #d4edda;
      border: 1px solid #c3e6cb;
    }

    .status-card.disconnected {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 10px;
    }

    .status-dot.green { background: #28a745; }
    .status-dot.red { background: #dc3545; }

    .status-text {
      font-weight: bold;
      font-size: 1.1em;
    }

    .username {
      font-size: 0.9em;
      color: #495057;
    }

    .auth-buttons {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }

    .operation-group {
      margin-bottom: 25px;
      padding: 20px;
      background: white;
      border-radius: 8px;
      border: 1px solid #dee2e6;
    }

    .operation-group h3 {
      margin-top: 0;
      color: #24292e;
    }

    .form-group {
      margin-bottom: 15px;
    }

    .form-input, .form-select {
      width: 100%;
      padding: 10px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 14px;
      margin-bottom: 10px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .form-hint {
      display: block;
      margin-top: 5px;
      margin-bottom: 10px;
      font-size: 12px;
      color: #6c757d;
      font-style: italic;
    }

    .repos-list {
      margin-top: 15px;
      max-height: 300px;
      overflow-y: auto;
    }

    .repo-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid #e9ecef;
    }

    .repo-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .repo-type, .pages-enabled {
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 3px;
      background: #e9ecef;
    }

    .pages-enabled {
      background: #d1ecf1;
      color: #0c5460;
    }

    .repo-link {
      color: #007bff;
      text-decoration: none;
      font-size: 14px;
    }

    .results-container {
      max-height: 400px;
      overflow-y: auto;
    }

    .result-item {
      margin-bottom: 15px;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid;
    }

    .result-item.success {
      background: #f8fff9;
      border-left-color: #28a745;
    }

    .result-item.error {
      background: #fff8f8;
      border-left-color: #dc3545;
    }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .result-timestamp {
      font-size: 12px;
      color: #6c757d;
    }

    .result-data {
      margin-top: 10px;
      background: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }

    .result-data pre {
      margin: 0;
      font-size: 12px;
      white-space: pre-wrap;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary { background: #007bff; color: white; }
    .btn-primary:hover:not(:disabled) { background: #0056b3; }

    .btn-secondary { background: #6c757d; color: white; }
    .btn-secondary:hover:not(:disabled) { background: #545b62; }

    .btn-success { background: #28a745; color: white; }
    .btn-success:hover:not(:disabled) { background: #1e7e34; }

    .btn-warning { background: #ffc107; color: #212529; }
    .btn-warning:hover:not(:disabled) { background: #e0a800; }

    .btn-info { background: #17a2b8; color: white; }
    .btn-info:hover:not(:disabled) { background: #117a8b; }

    .btn-outline {
      background: transparent;
      border: 1px solid #007bff;
      color: #007bff;
    }
    .btn-outline:hover:not(:disabled) {
      background: #007bff;
      color: white;
    }

    .clear-btn {
      margin-top: 15px;
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .loading-spinner {
      background: white;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 15px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .no-results {
      text-align: center;
      color: #6c757d;
      font-style: italic;
      padding: 20px;
    }

    h2 {
      color: #24292e;
      border-bottom: 2px solid #e1e4e8;
      padding-bottom: 5px;
      margin-bottom: 20px;
    }
  `]
})
export class GitHubDebugComponent implements OnInit, OnDestroy {
  private apiUrl = 'http://localhost:3000/api';
  private subscriptions: Subscription[] = [];
  private hasInitialized = false;

  // State
  connectionStatus: GitHubConnectionStatus | null = null;
  repositories: GitHubRepository[] = [];
  testResults: TestResult[] = [];
  isLoading = false;
  loadingMessage = '';

  // Form data
  newRepoName = '';
  makeRepoPrivate = false;
  selectedRepo = '';
  
  // Test CV push data
  selectedJobId = '';
  testPushRepoName = '';
  testPushPrivate = false;
  availableJobs: { id: string; name: string }[] = [];

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private route: ActivatedRoute,
    private githubService: GitHubPublishService
  ) {}

  ngOnInit() {
    // Load available CV jobs for testing
    this.loadAvailableJobs();
    
    // Check if we have OAuth callback parameters
    this.route.queryParams.subscribe(params => {
      if (params['connected']) {
        // OAuth callback detected - refresh user data then check status
        this.addTestResult(true, '🎉 GitHub OAuth authentication successful! You are now connected to GitHub.');
        this.handleOAuthSuccess();
      } else if (params['error']) {
        this.addTestResult(false, `GitHub OAuth failed: ${decodeURIComponent(params['error'])}`);
      } else {
        // Normal page load - check connection when user data is available
        this.waitForUserDataAndCheckStatus();
      }
    });
  }

  private handleOAuthSuccess() {
    // Wait a moment for backend to process, then refresh user data
    setTimeout(() => {
      const refreshSub = this.authService.refreshUserData().subscribe({
        next: () => {
          console.log('User data refreshed after OAuth - checking GitHub connection');
          this.checkConnection();
        },
        error: (error) => {
          console.error('Failed to refresh user data after OAuth:', error);
          this.addTestResult(false, 'Failed to refresh user data after OAuth');
          // Fall back to normal initialization
          this.waitForUserDataAndCheckStatus();
        }
      });
      this.subscriptions.push(refreshSub);
    }, 1500); // Give backend time to process the OAuth callback
  }

  private waitForUserDataAndCheckStatus() {
    const userSub = this.authService.user$.subscribe(user => {
      if (user && !this.hasInitialized) {
        // User is loaded and we haven't initialized yet
        this.hasInitialized = true;
        this.checkConnection();
      } else if (user === null && !this.hasInitialized) {
        // User is explicitly null (not logged in) and we haven't initialized yet
        this.hasInitialized = true;
        this.addTestResult(false, 'Not logged in. Redirecting to login page...');
      }
    });
    this.subscriptions.push(userSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }


  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    console.log('Token from authService:', token);
    console.log('Is logged in:', this.authService.isLoggedIn());
    console.log('Current user:', this.authService.getUser());
    
    if (!token) {
      console.error('No token available! Please login first.');
      this.addTestResult(false, 'No authentication token found. Please login first.');
    }
    
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private addTestResult(success: boolean, message: string, data?: any) {
    this.testResults.unshift({
      success,
      message,
      data,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 10 results
    if (this.testResults.length > 10) {
      this.testResults = this.testResults.slice(0, 10);
    }
  }

  async checkConnection() {
    this.isLoading = true;
    this.loadingMessage = 'Checking GitHub connection...';

    try {
      console.log('Checking GitHub connection status...');
      
      const response = await this.githubService.checkGitHubConnection();
      
      console.log('GitHub status response:', response);
      this.connectionStatus = response;
      this.addTestResult(true, 'Connection status checked successfully', response);
    } catch (error: any) {
      console.error('GitHub status check failed:', error);
      this.connectionStatus = {
        connected: false,
        message: 'Failed to check connection: ' + error.message
      };
      this.addTestResult(false, 'Failed to check GitHub connection', error);
    } finally {
      this.isLoading = false;
    }
  }

  async connectToGitHub() {
    this.isLoading = true;
    this.loadingMessage = 'Redirecting to GitHub...';

    try {
      const redirectUrl = this.githubService.getGitHubAuthUrl();
      console.log('Redirecting to:', redirectUrl);
      this.addTestResult(true, `Redirecting to GitHub OAuth: ${redirectUrl}`);
      
      // Redirect to GitHub OAuth
      window.location.href = redirectUrl;
    } catch (error: any) {
      console.error('GitHub connection error:', error);
      this.addTestResult(false, 'Failed to initiate GitHub connection', error);
      this.isLoading = false;
    }
  }

  async listRepositories() {
    this.isLoading = true;
    this.loadingMessage = 'Fetching repositories...';

    try {
      const response = await this.githubService.listRepositories();
      this.repositories = response;
      this.addTestResult(true, `Found ${this.repositories.length} repositories`, response);
    } catch (error: any) {
      this.addTestResult(false, 'Failed to fetch repositories', error);
    } finally {
      this.isLoading = false;
    }
  }

  async createRepository() {
    if (!this.newRepoName.trim()) return;

    this.isLoading = true;
    this.loadingMessage = `Creating repository '${this.newRepoName}'...`;

    try {
      const response = await this.githubService.createRepository(
        this.newRepoName.trim(),
        this.makeRepoPrivate,
        'Repository created via CV Landing Generator'
      );

      this.addTestResult(true, `Repository '${this.newRepoName}' created successfully`, response);
      this.newRepoName = '';
      this.makeRepoPrivate = false;
      
      // Refresh repositories list
      await this.listRepositories();
    } catch (error: any) {
      this.addTestResult(false, `Failed to create repository '${this.newRepoName}'`, error);
    } finally {
      this.isLoading = false;
    }
  }

  async uploadTestFiles() {
    if (!this.selectedRepo) return;

    this.isLoading = true;
    this.loadingMessage = `Uploading test files to '${this.selectedRepo}'...`;

    try {
      const response = await this.githubService.uploadTestFiles(this.selectedRepo);
      this.addTestResult(true, `Test files uploaded to '${this.selectedRepo}'`, response);
    } catch (error: any) {
      this.addTestResult(false, `Failed to upload test files to '${this.selectedRepo}'`, error);
    } finally {
      this.isLoading = false;
    }
  }

  async enableGitHubPages() {
    if (!this.selectedRepo) return;

    this.isLoading = true;
    this.loadingMessage = `Enabling GitHub Pages for '${this.selectedRepo}'...`;

    try {
      const response = await this.githubService.enableGitHubPages(this.selectedRepo);
      this.addTestResult(true, `GitHub Pages enabled for '${this.selectedRepo}'`, response);
      
      // Refresh repositories to see Pages status
      await this.listRepositories();
    } catch (error: any) {
      this.addTestResult(false, `Failed to enable Pages for '${this.selectedRepo}'`, error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadAvailableJobs() {
    try {
      // Load available generated CV jobs from the generated directory
      const response = await this.http.get<{ jobs: { id: string; name: string }[] }>(
        `${this.apiUrl}/cv/jobs`,
        { headers: this.getAuthHeaders() }
      ).toPromise();

      if (response?.jobs) {
        this.availableJobs = response.jobs;
      }
    } catch (error: any) {
      console.log('Could not load available jobs:', error);
      // For now, add some mock data for testing
      this.availableJobs = [
        { id: '0875a3db-4f8b-4974-aaec-ffc910cfa50b', name: 'Hadar Dashty CV' },
        { id: 'df768255-3abe-42aa-b1a6-d8d8d5819548', name: 'Test CV' }
      ];
    }
  }

  async testPushCVSite() {
    if (!this.selectedJobId) return;

    this.isLoading = true;
    this.loadingMessage = 'Testing CV site push to GitHub...';

    try {
      const response = await this.githubService.publishCVSite(
        this.selectedJobId,
        this.testPushRepoName || undefined,
        this.testPushPrivate
      );

      if (response.success) {
        this.addTestResult(true, 'CV site pushed successfully to GitHub', response);
        // Refresh repositories list to show the new repo
        await this.listRepositories();
      } else {
        this.addTestResult(false, 'Failed to push CV site to GitHub', response);
      }
    } catch (error: any) {
      this.addTestResult(false, 'Failed to push CV site to GitHub', error);
    } finally {
      this.isLoading = false;
    }
  }

  clearResults() {
    this.testResults = [];
  }
}