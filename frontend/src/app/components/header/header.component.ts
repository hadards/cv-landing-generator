import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <header class="bg-white shadow-sm border-b border-gray-200">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center">
            <a routerLink="/home" class="flex items-center">
              <div class="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-lg">CV</span>
              </div>
              <span class="ml-3 text-xl font-semibold text-gray-900">Landing Generator</span>
            </a>
          </div>

          <!-- Navigation -->
          <div class="flex items-center space-x-8">
            <a routerLink="/home" 
               routerLinkActive="text-primary-600" 
               [routerLinkActiveOptions]="{exact: true}"
               class="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
              Home
            </a>
            
            <a *ngIf="!user" routerLink="/test" 
               routerLinkActive="text-primary-600"
               class="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
              API Test
            </a>

            <a *ngIf="user" routerLink="/dashboard" 
               routerLinkActive="text-primary-600"
               class="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
              Dashboard
            </a>

            <a *ngIf="user" routerLink="/upload" 
                routerLinkActive="text-primary-600"
                class="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
              Upload CV
            </a>

            <!-- Auth Buttons -->
            <div *ngIf="!user" class="flex items-center space-x-4">
              <a routerLink="/login" class="btn-secondary text-sm">
                Sign In
              </a>
              <a routerLink="/login" class="btn-primary text-sm">
                Get Started
              </a>
            </div>

            <!-- User Menu -->
            <div *ngIf="user" class="flex items-center space-x-4">
              <div class="flex items-center space-x-3">
                <img [src]="user.picture" [alt]="user.name" class="h-8 w-8 rounded-full">
                <span class="text-sm font-medium text-gray-900">{{ user.name }}</span>
              </div>
              <button (click)="logout()" class="btn-secondary text-sm">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  `
})
export class HeaderComponent implements OnInit {
    user: User | null = null;

    constructor(private authService: AuthService) { }

    ngOnInit() {
        this.authService.user$.subscribe(user => {
            this.user = user;
        });
    }

    logout() {
        this.authService.logout().subscribe();
    }
}