// File: frontend/src/app/pages/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';

interface ProjectStats {
  total: number;
  published: number;
  drafts: number;
  views: number;
}

interface RecentProject {
  id: string;
  name: string;
  status: 'published' | 'draft' | 'processing';
  createdAt: string;
  views: number;
  url?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container section-padding">
      <!-- Welcome Section -->
      <div class="mb-8 fade-in">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {{ getFirstName() }}! 👋
            </h1>
            <p class="text-gray-600">
              Manage your CV landing pages and track their performance
            </p>
          </div>
          <div class="mt-4 md:mt-0">
            <a routerLink="/upload" class="btn-primary">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Create New
            </a>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="card-minimal slide-up" style="animation-delay: 0.1s">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Projects</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="card-minimal slide-up" style="animation-delay: 0.2s">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Published</p>
              <p class="text-2xl font-bold text-green-600">{{ stats.published }}</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="card-minimal slide-up" style="animation-delay: 0.3s">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Drafts</p>
              <p class="text-2xl font-bold text-yellow-600">{{ stats.drafts }}</p>
            </div>
            <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="card-minimal slide-up" style="animation-delay: 0.4s">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Views</p>
              <p class="text-2xl font-bold text-purple-600">{{ stats.views }}</p>
            </div>
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div class="card slide-up" style="animation-delay: 0.5s">
          <div class="text-center">
            <div class="w-16 h-16 bg-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Upload New CV</h3>
            <p class="text-gray-600 text-sm mb-4">
              Generate a professional landing page from your latest CV
            </p>
            <a routerLink="/upload" class="btn-primary w-full">
              Get Started
            </a>
          </div>
        </div>

        <div class="card slide-up" style="animation-delay: 0.6s">
          <div class="text-center">
            <div class="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">View Analytics</h3>
            <p class="text-gray-600 text-sm mb-4">
              Track views, clicks, and engagement on your landing pages
            </p>
            <button class="btn-secondary w-full" disabled>
              Coming Soon
            </button>
          </div>
        </div>

        <div class="card slide-up" style="animation-delay: 0.7s">
          <div class="text-center">
            <div class="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Browse Templates</h3>
            <p class="text-gray-600 text-sm mb-4">
              Explore different design templates for your landing page
            </p>
            <button class="btn-secondary w-full" disabled>
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      <!-- Recent Projects -->
      <div class="card slide-up" style="animation-delay: 0.8s">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-gray-900">Recent Projects</h2>
          <button class="btn-ghost text-sm">View All</button>
        </div>

        <div *ngIf="recentProjects.length === 0" class="text-center py-12">
          <div class="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p class="text-gray-600 mb-4">Create your first CV landing page to get started</p>
          <a routerLink="/upload" class="btn-primary">
            Create Your First Project
          </a>
        </div>

        <div *ngIf="recentProjects.length > 0" class="space-y-4">
          <div *ngFor="let project of recentProjects; trackBy: trackByProjectId" 
               class="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
            <div class="flex items-center space-x-4">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                   [class.bg-green-100]="project.status === 'published'"
                   [class.bg-yellow-100]="project.status === 'draft'"
                   [class.bg-blue-100]="project.status === 'processing'">
                <svg class="w-5 h-5"
                     [class.text-green-600]="project.status === 'published'"
                     [class.text-yellow-600]="project.status === 'draft'"
                     [class.text-blue-600]="project.status === 'processing'"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path *ngIf="project.status === 'published'" 
                        stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M5 13l4 4L19 7"/>
                  <path *ngIf="project.status === 'draft'" 
                        stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  <path *ngIf="project.status === 'processing'" 
                        stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </div>
              <div>
                <h4 class="font-medium text-gray-900">{{ project.name }}</h4>
                <div class="flex items-center space-x-4 text-sm text-gray-500">
                  <span class="capitalize">{{ project.status }}</span>
                  <span>•</span>
                  <span>{{ formatDate(project.createdAt) }}</span>
                  <span>•</span>
                  <span>{{ project.views }} views</span>
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button *ngIf="project.status === 'published' && project.url" 
                      class="btn-ghost p-2"
                      title="View Live">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </button>
              <button class="btn-ghost p-2" title="Edit">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                </svg>
              </button>
              <button class="btn-ghost p-2 text-red-600" title="Delete">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  stats: ProjectStats = {
    total: 0,
    published: 0,
    drafts: 0,
    views: 0
  };
  recentProjects: RecentProject[] = [];

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.user = user;
    });
    
    // Load dashboard data
    this.loadDashboardData();
  }

  getFirstName(): string {
    return this.user?.name?.split(' ')[0] || 'User';
  }

  loadDashboardData() {
    // Mock data for now - replace with actual API calls
    this.stats = {
      total: 0,
      published: 0,
      drafts: 0,
      views: 0
    };
    
    this.recentProjects = [];
  }

  trackByProjectId(index: number, project: RecentProject): string {
    return project.id;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}