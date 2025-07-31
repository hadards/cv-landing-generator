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

type PublishState = 'idle' | 'auth-needed' | 'publishing' | 'deploying' | 'success' | 'error';

@Component({
  selector: 'app-github-publish-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Match your app's button styling perfectly - use your design system classes -->
    
    <!-- Idle/Ready State -->
    <button 
      *ngIf="state === 'idle'"
      (click)="handlePublish()"
      [disabled]="!jobId"
      class="btn-primary flex items-center justify-center space-x-2 w-full">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
      <span>Publish to GitHub</span>
    </button>

    <!-- Auth Needed State -->
    <div *ngIf="state === 'auth-needed'" class="flex flex-col items-center space-y-2 w-full">
      <button 
        (click)="connectGitHub()"
        class="btn-secondary flex items-center justify-center space-x-2 w-full">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        <span>Connect GitHub</span>
      </button>
      <p class="text-xs warm-text-light text-center">Connect your GitHub account to publish your CV</p>
    </div>

    <!-- Publishing State -->
    <button 
      *ngIf="state === 'publishing'"
      disabled
      class="btn-primary flex items-center justify-center space-x-2 opacity-80 cursor-not-allowed w-full">
      <div class="loading-spinner w-4 h-4"></div>
      <span>Publishing...</span>
    </button>

    <!-- Deploying State -->
    <div *ngIf="state === 'deploying'" class="flex flex-col items-center space-y-2 w-full">
      <button 
        disabled
        class="btn-primary flex items-center justify-center space-x-2 opacity-80 cursor-not-allowed w-full">
        <div class="loading-spinner w-4 h-4"></div>
        <span>Deploying...</span>
      </button>
      <p class="text-xs warm-text-light text-center">
        GitHub Pages is building your site (1-3 minutes)
      </p>
    </div>

    <!-- Success State -->
    <div *ngIf="state === 'success'" class="flex flex-col items-center space-y-3 w-full">
      <button 
        disabled
        class="btn-primary flex items-center justify-center space-x-2 w-full">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>Published Successfully!</span>
      </button>
      
      <div class="text-center">
        <p class="warm-text-primary font-medium mb-2">🎉 Your CV is now live!</p>
        <div class="flex items-center justify-center space-x-3 text-sm">
          <a [href]="publishedResult?.siteUrl" target="_blank" class="text-warm-orange hover:text-warm-coral font-medium underline">
            View Live Site
          </a>
          <span class="warm-text-light">•</span>
          <a [href]="publishedResult?.repoUrl" target="_blank" class="text-warm-orange hover:text-warm-coral font-medium underline">
            View Repository
          </a>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div *ngIf="state === 'error'" class="flex flex-col items-center space-y-3 w-full">
      <div class="text-center">
        <div class="flex items-center justify-center space-x-2 text-red-600 mb-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728"/>
          </svg>
          <span class="font-medium">Publishing Failed</span>
        </div>
        <p class="text-sm warm-text-secondary mb-3">{{ errorMessage }}</p>
      </div>
      
      <div class="flex flex-col space-y-2 w-full">
        <button (click)="handlePublish()" class="btn-primary text-sm w-full">
          Try Again
        </button>
        <button (click)="reset()" class="btn-secondary text-sm w-full">
          Cancel
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* Only custom styles needed - everything else uses your app's design system */
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
        
        // Start polling the GitHub Pages URL to check when it's live
        if (this.publishedResult.siteUrl) {
          console.log('Starting to poll GitHub Pages URL:', this.publishedResult.siteUrl);
          this.state = 'deploying';
          this.pollSiteUrl(this.publishedResult.siteUrl);
        } else {
          this.state = 'success';
          this.published.emit(this.publishedResult);
        }
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

  private async pollSiteUrl(siteUrl: string) {
    const maxAttempts = 30; // Poll for up to 5 minutes (30 attempts * 10 seconds)
    let attempts = 0;

    const poll = async () => {
      attempts++;
      console.log(`Polling attempt ${attempts}/${maxAttempts} for ${siteUrl}`);

      try {
        const status = await this.githubService.checkSiteStatus(siteUrl);
        console.log('Site status check result:', status);
        
        if (status.live) {
          console.log('🎉 GitHub Pages site is live and accessible!');
          this.state = 'success';
          this.published.emit(this.publishedResult!);
          return;
        }
        
        console.log(`Site not yet live (attempt ${attempts}/${maxAttempts}): ${status.message}`);
        
        if (attempts < maxAttempts) {
          // Wait 10 seconds before next attempt
          setTimeout(poll, 10000);
        } else {
          console.log('Max polling attempts reached - assuming site is ready');
          // Even if we can't verify, assume it's ready after max attempts
          this.state = 'success';
          this.published.emit(this.publishedResult!);
        }
        
      } catch (error: any) {
        console.log(`Error checking site status (attempt ${attempts}/${maxAttempts}):`, error.message);
        
        if (attempts < maxAttempts) {
          // Wait 10 seconds before next attempt
          setTimeout(poll, 10000);
        } else {
          console.log('Max polling attempts reached - assuming site is ready');
          // Even if we can't verify, assume it's ready after max attempts
          this.state = 'success';
          this.published.emit(this.publishedResult!);
        }
      }
    };

    // Start polling immediately
    poll();
  }

  reset() {
    this.state = 'idle';
    this.errorMessage = '';
    this.publishedResult = null;
    this.checkInitialState();
  }
}