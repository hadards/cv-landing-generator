import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-deploy-website',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'deploy-website.component.html',
  styleUrls: ['deploy-website.component.scss']
})
export class DeployWebsiteComponent {
  @Input() cvData: any = null;
  @Input() userId: string = '';
  @Output() deploymentComplete = new EventEmitter<any>();

  siteName: string = '';
  isDeploying: boolean = false;
  deploymentStatus: string = '';
  deploymentError: string = '';
  deployedUrls: any = null;
  hasGitHubConnection: boolean = false;
  showDeployForm: boolean = false;

  constructor(private http: HttpClient) {}

  async ngOnInit() {
    await this.checkGitHubConnection();
    this.generateSiteName();
  }

  async checkGitHubConnection() {
    try {
      const response = await this.http.get<any>(`/api/sites/list?userId=${this.userId}`).toPromise();
      this.hasGitHubConnection = response.hasGitHubConnection;
    } catch (error) {
      console.error('Failed to check GitHub connection:', error);
      this.hasGitHubConnection = false;
    }
  }

  generateSiteName() {
    if (this.cvData?.personalInfo?.name) {
      // Generate a clean site name from the user's name
      this.siteName = this.cvData.personalInfo.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 30) + '-portfolio';
    } else {
      this.siteName = 'my-portfolio';
    }
  }

  async connectGitHub() {
    try {
      const response = await this.http.post<any>('/api/github/connect', { userId: this.userId }).toPromise();
      
      if (response.oauthUrl) {
        // Store current state before redirect
        localStorage.setItem('pendingDeployment', JSON.stringify({
          cvData: this.cvData,
          siteName: this.siteName
        }));
        
        // Redirect to GitHub OAuth
        window.location.href = response.oauthUrl;
      }
    } catch (error: any) {
      console.error('Failed to connect GitHub:', error);
      this.deploymentError = 'Failed to connect to GitHub. Please try again.';
    }
  }

  showDeploymentForm() {
    this.showDeployForm = true;
    this.deploymentError = '';
    this.deploymentStatus = '';
  }

  async deployWebsite() {
    if (!this.siteName.trim()) {
      this.deploymentError = 'Please enter a site name';
      return;
    }

    if (!this.cvData) {
      this.deploymentError = 'No CV data available for deployment';
      return;
    }

    this.isDeploying = true;
    this.deploymentError = '';
    this.deploymentStatus = 'Starting deployment...';

    try {
      // Step 1: Deploy to GitHub
      this.deploymentStatus = 'Creating GitHub repository...';
      
      const deployResponse = await this.http.post<any>('/api/cv/deploy', {
        userId: this.userId,
        cvData: this.cvData,
        siteName: this.siteName.trim()
      }).toPromise();

      this.deploymentStatus = 'Enabling GitHub Pages...';
      
      // Step 2: Wait a moment for GitHub Pages to process
      await this.delay(3000);
      
      this.deploymentStatus = 'Deployment complete!';
      
      this.deployedUrls = {
        github: deployResponse.githubUrl,
        pages: deployResponse.pagesUrl,
        siteId: deployResponse.siteId
      };

      // Emit success event
      this.deploymentComplete.emit({
        success: true,
        urls: this.deployedUrls,
        siteName: this.siteName
      });

    } catch (error: any) {
      console.error('Deployment failed:', error);
      this.deploymentError = error.error?.error || 'Deployment failed. Please try again.';
      this.deploymentStatus = '';
    } finally {
      this.isDeploying = false;
    }
  }

  async deleteDeployment() {
    if (!this.deployedUrls?.siteId) return;

    if (!confirm('Are you sure you want to delete this deployment? This will remove the GitHub repository.')) {
      return;
    }

    try {
      await this.http.delete('/api/sites/delete', {
        body: { 
          siteId: this.deployedUrls.siteId, 
          userId: this.userId 
        }
      }).toPromise();

      // Reset state
      this.deployedUrls = null;
      this.showDeployForm = false;
      this.deploymentStatus = '';
      
      alert('Deployment deleted successfully!');

    } catch (error: any) {
      console.error('Failed to delete deployment:', error);
      alert('Failed to delete deployment. Please try again.');
    }
  }

  resetForm() {
    this.showDeployForm = false;
    this.deploymentError = '';
    this.deploymentStatus = '';
    this.deployedUrls = null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Check for pending deployment after GitHub OAuth return
  checkPendingDeployment() {
    const pending = localStorage.getItem('pendingDeployment');
    if (pending) {
      const data = JSON.parse(pending);
      this.cvData = data.cvData;
      this.siteName = data.siteName;
      localStorage.removeItem('pendingDeployment');
      
      // Auto-show deployment form if user just connected GitHub
      setTimeout(() => {
        this.checkGitHubConnection().then(() => {
          if (this.hasGitHubConnection) {
            this.showDeploymentForm();
          }
        });
      }, 1000);
    }
  }
}