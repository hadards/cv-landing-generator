import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface Site {
  id: number;
  site_name: string;
  repo_name: string;
  github_url: string;
  pages_url: string;
  vercel_url: string;
  deployment_status: 'pending' | 'deploying' | 'deployed' | 'failed';
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'sites.component.html',
  styleUrls: ['sites.component.scss']
})
export class SitesComponent implements OnInit {
  sites: Site[] = [];
  loading = true;
  hasGitHubConnection = false;
  error: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadSites();
  }

  async loadSites() {
    try {
      this.loading = true;
      this.error = null;

      // Get current user ID (you'll need to implement this based on your auth system)
      const userId = this.getCurrentUserId();
      
      const response = await this.http.get<any>(`/api/sites/list?userId=${userId}`).toPromise();
      
      this.sites = response.sites;
      this.hasGitHubConnection = response.hasGitHubConnection;

    } catch (error: any) {
      console.error('Failed to load sites:', error);
      this.error = 'Failed to load your sites. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async connectGitHub() {
    try {
      const userId = this.getCurrentUserId();
      
      const response = await this.http.post<any>('/api/github/connect', { userId }).toPromise();
      
      if (response.oauthUrl) {
        // Redirect to GitHub OAuth
        window.location.href = response.oauthUrl;
      }

    } catch (error: any) {
      console.error('Failed to initiate GitHub connection:', error);
      alert('Failed to connect to GitHub. Please try again.');
    }
  }

  async deleteSite(site: Site) {
    if (!confirm(`Are you sure you want to delete "${site.site_name}"? This will also delete the GitHub repository.`)) {
      return;
    }

    try {
      const userId = this.getCurrentUserId();
      
      await this.http.delete('/api/sites/delete', {
        body: { siteId: site.id, userId }
      }).toPromise();

      // Remove from local list
      this.sites = this.sites.filter(s => s.id !== site.id);
      
      alert('Site deleted successfully!');

    } catch (error: any) {
      console.error('Failed to delete site:', error);
      alert('Failed to delete site. Please try again.');
    }
  }

  createNewSite() {
    // Navigate to CV upload/processing page
    this.router.navigate(['/cv-wizard']);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'deployed': return 'text-green-600 bg-green-100';
      case 'deploying': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'deployed': return 'Live';
      case 'deploying': return 'Deploying...';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  private getCurrentUserId(): string {
    // Implement this based on your authentication system
    // For now, returning a placeholder
    return localStorage.getItem('userId') || '1';
  }
}