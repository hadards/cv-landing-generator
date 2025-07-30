import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GitHubPublishService, PublishResult } from '../../services/github-publish.service';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

export interface PublishSuccess {
  repoUrl: string;
  siteUrl: string;
  repoName: string;
  message: string;
}

type PublishState = 'idle' | 'auth-needed' | 'publishing' | 'success' | 'error';

@Component({
  selector: 'app-github-publish-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="publish-button-container">
      <!-- Idle/Ready State -->
      <button 
        *ngIf="state === 'idle'"
        (click)="handlePublish()"
        [disabled]="!jobId"
        class="btn-success flex items-center justify-center space-x-2">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        <span>Publish to GitHub</span>
      </button>

      <!-- Auth Needed State -->
      <div *ngIf="state === 'auth-needed'" class="auth-needed-container">
        <button 
          (click)="connectGitHub()"
          class="btn-primary flex items-center justify-center space-x-2">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <span>Connect GitHub</span>
        </button>
        <p class="auth-help-text">Connect your GitHub account to publish your CV</p>
      </div>

      <!-- Publishing State -->
      <div *ngIf="state === 'publishing'" class="publishing-container">
        <button 
          disabled
          class="btn-success flex items-center justify-center space-x-2 opacity-80">
          <div class="loading-spinner w-4 h-4"></div>
          <span>Publishing to GitHub...</span>
        </button>
        <div class="publishing-steps">
          <div class="step-item">
            <div class="step-spinner"></div>
            <span>Creating repository & uploading files</span>
          </div>
          <div class="step-item">
            <div class="step-spinner"></div>
            <span>Enabling GitHub Pages</span>
          </div>
          <div class="step-item">
            <div class="step-spinner"></div>
            <span>Generating live site URL</span>
          </div>
        </div>
      </div>

      <!-- Success State -->
      <div *ngIf="state === 'success'" class="success-container">
        <div class="success-message">
          <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">🎉 Live on GitHub Pages!</span>
        </div>
        
        <div class="auto-completion-info">
          <p class="completion-text">✅ Repository created & files uploaded</p>
          <p class="completion-text">✅ GitHub Pages enabled automatically</p>
          <p class="completion-text">✅ Your CV is now live on the web!</p>
        </div>
        
        <div class="success-links">
          <a [href]="publishedResult?.siteUrl" target="_blank" class="link-button site-link">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
            <span>View Live Site</span>
          </a>
          
          <a [href]="publishedResult?.repoUrl" target="_blank" class="link-button repo-link">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span>View Repository</span>
          </a>
        </div>
        
        <button (click)="reset()" class="reset-button">
          Publish Another
        </button>
      </div>

      <!-- Error State -->
      <div *ngIf="state === 'error'" class="error-container">
        <div class="error-message">
          <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728"/>
          </svg>
          <span class="font-medium">Publishing Failed</span>
        </div>
        
        <p class="error-details">{{ errorMessage }}</p>
        
        <div class="error-actions">
          <button (click)="handlePublish()" class="btn-primary">
            Try Again
          </button>
          <button (click)="reset()" class="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .publish-button-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-success {
      background: #10b981;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #059669;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #e5e7eb;
    }

    .btn-success, .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-success:disabled, .btn-primary:disabled, .btn-secondary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .auth-needed-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .auth-help-text {
      font-size: 0.75rem;
      color: #6b7280;
      margin: 0;
    }

    .publishing-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .publishing-steps {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      min-width: 250px;
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: #065f46;
    }

    .step-spinner {
      width: 0.75rem;
      height: 0.75rem;
      border: 1px solid #bbf7d0;
      border-top: 1px solid #10b981;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .auto-completion-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-bottom: 0.75rem;
    }

    .completion-text {
      font-size: 0.75rem;
      color: #065f46;
      margin: 0;
    }

    .success-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      max-width: 300px;
    }

    .success-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #065f46;
      font-size: 0.875rem;
    }

    .success-links {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
    }

    .link-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      text-decoration: none;
      font-size: 0.75rem;
      font-weight: 500;
      transition: all 0.2s;
    }

    .site-link {
      background: #10b981;
      color: white;
    }

    .site-link:hover {
      background: #059669;
    }

    .repo-link {
      background: #374151;
      color: white;
    }

    .repo-link:hover {
      background: #1f2937;
    }

    .reset-button {
      padding: 0.5rem 1rem;
      background: transparent;
      color: #6b7280;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .reset-button:hover {
      background: #f9fafb;
      color: #374151;
    }

    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      max-width: 300px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #b91c1c;
      font-size: 0.875rem;
    }

    .error-details {
      font-size: 0.75rem;
      color: #7f1d1d;
      margin: 0;
      text-align: center;
    }

    .error-actions {
      display: flex;
      gap: 0.5rem;
    }

    .loading-spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class GitHubPublishButtonComponent implements OnInit {
  @Input() jobId: string = '';
  @Output() published = new EventEmitter<PublishSuccess>();
  @Output() error = new EventEmitter<string>();

  state: PublishState = 'idle';
  errorMessage = '';
  publishedResult: PublishSuccess | null = null;

  constructor(
    private githubService: GitHubPublishService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('GitHub publish button init - jobId:', this.jobId);
    this.checkInitialState();
    this.checkForAuthCallback();
  }

  private checkForAuthCallback() {
    // Check if we just returned from GitHub auth
    this.route.queryParams.subscribe(params => {
      console.log('GitHub publish button - query params:', params);
      if (params['connected'] === 'true') {
        console.log('Detected GitHub auth callback');
        
        // Clear the URL parameter
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
        
        // Handle OAuth success like in debug component
        this.handleOAuthSuccess();
      }
    });
  }

  private handleOAuthSuccess() {
    // Wait a moment for backend to process, then refresh user data
    setTimeout(() => {
      this.authService.refreshUserData().subscribe({
        next: () => {
          console.log('User data refreshed after OAuth - checking for auto-publish');
          
          // Check if we should auto-publish after auth
          const jobIdToPublish = localStorage.getItem('github_publish_after_auth');
          console.log('Stored job ID for auto-publish:', jobIdToPublish, 'Current job ID:', this.jobId);
          
          if (jobIdToPublish && jobIdToPublish === this.jobId) {
            console.log('Auto-publishing after GitHub auth');
            // Clear the stored intention
            localStorage.removeItem('github_publish_after_auth');
            
            // Auto-start publishing after successful auth
            this.handlePublish();
          } else {
            // Just update the state to show we're connected
            this.checkInitialState();
          }
        },
        error: (error) => {
          console.error('Failed to refresh user data after OAuth:', error);
          // Clear any stored intention and update state
          localStorage.removeItem('github_publish_after_auth');
          this.checkInitialState();
        }
      });
    }, 1500); // Give backend time to process the OAuth callback
  }

  private async checkInitialState() {
    console.log('Checking initial state for GitHub publish button');
    
    if (!this.authService.isLoggedIn()) {
      console.log('User not logged in');
      this.state = 'error';
      this.errorMessage = 'Please log in to publish to GitHub';
      return;
    }

    // Check GitHub connection from backend to get accurate status
    try {
      const status = await this.githubService.checkGitHubConnection();
      console.log('GitHub connection status:', status);
      
      if (status.connected) {
        this.state = 'idle';
        console.log('GitHub connected - ready to publish');
      } else {
        this.state = 'auth-needed';
        console.log('GitHub not connected - auth needed');
      }
    } catch (error) {
      console.error('Failed to check GitHub status:', error);
      // Fallback to local check
      if (this.githubService.isGitHubConnected()) {
        this.state = 'idle';
        console.log('GitHub connected (local check) - ready to publish');
      } else {
        this.state = 'auth-needed';
        console.log('GitHub not connected (local check) - auth needed');
      }
    }
  }

  async handlePublish() {
    console.log('handlePublish called with jobId:', this.jobId);
    
    if (!this.jobId) {
      console.log('No job ID provided');
      this.state = 'error';
      this.errorMessage = 'No CV job ID provided';
      this.error.emit('No CV job ID provided');
      return;
    }

    console.log('Checking GitHub connection before publishing...');
    // Check GitHub connection status from backend first
    try {
      const status = await this.githubService.checkGitHubConnection();
      console.log('GitHub connection check result:', status);
      
      if (!status.connected) {
        console.log('GitHub not connected - switching to auth-needed state');
        this.state = 'auth-needed';
        return;
      }
    } catch (error) {
      console.error('Failed to check GitHub connection:', error);
      // Fallback to local check
      if (!this.githubService.isGitHubConnected()) {
        console.log('GitHub not connected (local check) - switching to auth-needed state');
        this.state = 'auth-needed';
        return;
      }
    }

    console.log('GitHub connected - starting publishing process');
    this.state = 'publishing';

    try {
      // This single call does EVERYTHING automatically:
      // 1. Creates GitHub repository with auto-generated name
      // 2. Uploads all CV website files (index.html, styles.css, script.js, data.js, README.md)
      // 3. Enables GitHub Pages automatically 
      // 4. Returns live site URL ready to share
      const result = await this.githubService.publishCVSite(this.jobId);

      if (result.success) {
        this.publishedResult = {
          repoUrl: result.repository?.url || '',
          siteUrl: result.pages?.url || '',
          repoName: result.repository?.name || '',
          message: result.message
        };
        
        this.state = 'success';
        this.published.emit(this.publishedResult);
      } else {
        this.state = 'error';
        this.errorMessage = result.message || 'Automatic publishing failed';
        this.error.emit(this.errorMessage);
      }
    } catch (err: any) {
      this.state = 'error';
      this.errorMessage = err.message || 'An unexpected error occurred during automatic publishing';
      this.error.emit(this.errorMessage);
    }
  }

  connectGitHub() {
    console.log('connectGitHub called - storing job ID and redirecting to GitHub OAuth');
    console.log('Current job ID:', this.jobId);
    
    try {
      // Store the intention to publish after auth
      if (this.jobId) {
        localStorage.setItem('github_publish_after_auth', this.jobId);
        console.log('Stored job ID for auto-publish:', this.jobId);
      }
      
      // Pass current path as return URL so user comes back here after auth
      const authUrl = this.githubService.getGitHubAuthUrl(window.location.pathname);
      console.log('Redirecting to GitHub OAuth:', authUrl);
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('Failed to connect to GitHub:', err);
      this.state = 'error';
      this.errorMessage = err.message || 'Failed to connect to GitHub';
      this.error.emit(this.errorMessage);
    }
  }

  reset() {
    this.state = 'idle';
    this.errorMessage = '';
    this.publishedResult = null;
    this.checkInitialState();
  }
}