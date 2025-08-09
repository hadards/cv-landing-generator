// File: frontend/src/app/components/header/header.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="bg-white border-b border-gray-200 sticky top-0 z-50 h-20">
      <nav class="container h-full">
        <div class="flex justify-between items-center h-full px-2 md:px-4">
          <!-- Logo -->
          <div class="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
            <img src="assets/hadar-logo.png" alt="Hadar Logo" class="h-24 md:h-64 flex-shrink-0" style="width: auto; min-width: 96px;" 
                 [style.min-width]="'min(96px, 20vw)'"
                 [style.min-width.md]="'256px'">
            <div class="min-w-0 flex-1">
              <h1 class="text-lg md:text-xl font-bold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">CV to Landing</h1>
              <p class="text-xs md:text-sm text-gray-600 -mt-1 whitespace-nowrap overflow-hidden text-ellipsis">Create • Share • Shine</p>
            </div>
          </div>

          <!-- Navigation -->
          <div class="hidden md:flex items-center space-x-4">
            <a routerLink="/home" 
               routerLinkActive="active" 
               [routerLinkActiveOptions]="{exact: true}"
               class="nav-link">
              Home
            </a>
            
            <a *ngIf="user" 
               routerLink="/upload" 
               routerLinkActive="active"
               class="nav-link">
              Create
            </a>
          </div>

          <!-- User Actions -->
          <div class="flex items-center space-x-1 md:space-x-3 flex-shrink-0">
            <!-- Mobile Menu Button -->
            <button *ngIf="!user" 
                    (click)="toggleMobileMenu()" 
                    class="md:hidden btn-ghost p-2">
              Menu
            </button>

            <!-- Auth Buttons -->
            <div *ngIf="!user" class="hidden md:flex items-center space-x-3">
              <a routerLink="/login" class="btn-secondary">
                Sign In
              </a>
              <a routerLink="/login" class="btn-primary">
                Get Started
              </a>
            </div>

            <!-- User Menu -->
            <div *ngIf="user" class="relative flex items-center space-x-2 md:space-x-3">
              <!-- User Profile Button -->
              <button (click)="toggleUserMenu()" 
                      class="hidden md:flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div class="w-8 h-8 rounded-full overflow-hidden ring-2 ring-blue-500 shadow-md">
                  <img [src]="user.picture" [alt]="user.name" class="w-full h-full object-cover">
                </div>
                <div class="hidden lg:block text-left">
                  <p class="text-sm font-semibold text-gray-900">{{ getFirstName(user.name) }}</p>
                  <p class="text-xs text-gray-600">{{ user.email }}</p>
                </div>
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              
              <!-- User Dropdown Menu -->
              <div *ngIf="showUserMenu" 
                   class="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div class="py-2">
                  <button (click)="logout(); closeUserMenu()" 
                          class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
              
              <!-- Mobile Menu Button for authenticated users -->
              <button (click)="toggleMobileMenu()" 
                      class="md:hidden btn-ghost p-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Menu -->
        <div *ngIf="showMobileMenu" 
             class="md:hidden absolute left-0 right-0 top-full bg-white border-t border-gray-200 shadow-lg z-40">
          <div class="px-4 py-6">
            <!-- Navigation Links -->
            <div class="space-y-1 mb-6">
              <a routerLink="/home" 
                 (click)="closeMobileMenu()"
                 routerLinkActive="mobile-nav-active"
                 [routerLinkActiveOptions]="{exact: true}"
                 class="mobile-nav-link">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                Home
              </a>
              
              <a *ngIf="user"
                 routerLink="/upload" 
                 (click)="closeMobileMenu()"
                 routerLinkActive="mobile-nav-active"
                 class="mobile-nav-link">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Create
              </a>
            </div>
            
            <!-- User Section -->
            <div *ngIf="user" class="border-t border-gray-100 pt-6">
              <!-- User Info -->
              <div class="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <div class="w-12 h-12 rounded-full overflow-hidden ring-2 ring-blue-500">
                  <img [src]="user.picture" [alt]="user.name" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ user.name }}</p>
                  <p class="text-xs text-gray-600 truncate">{{ user.email }}</p>
                </div>
              </div>
              
              <!-- Sign Out Button -->
              <button (click)="logout(); closeMobileMenu()"
                      class="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                <span class="font-medium">Sign Out</span>
              </button>
            </div>
            
            <!-- Non-authenticated user options -->
            <div *ngIf="!user" class="border-t border-gray-100 pt-6 space-y-3">
              <a routerLink="/login" 
                 (click)="closeMobileMenu()"
                 class="w-full flex items-center justify-center space-x-2 px-4 py-3 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                </svg>
                <span class="font-medium">Sign In</span>
              </a>
              
              <a routerLink="/login" 
                 (click)="closeMobileMenu()"
                 class="w-full flex items-center justify-center space-x-2 px-4 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <span class="font-medium">Get Started</span>
              </a>
            </div>
          </div>
        </div>
      </nav>
    </header>
  `,
  styles: [`
    .nav-link {
      color: #6b7280;
      font-weight: 500;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      transition: all 0.2s ease;
      text-decoration: none;
      font-size: 0.875rem;
    }

    .nav-link:hover {
      color: #1f2937;
      background: #f3f4f6;
    }

    .nav-link.active {
      color: #2563eb;
      background: #eff6ff;
    }

    .btn-primary {
      background: #2563eb;
      color: white;
      font-weight: 500;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      border: none;
      text-decoration: none;
      font-size: 0.875rem;
      transition: all 0.2s ease;
      display: inline-block;
      text-align: center;
    }

    .btn-primary:hover {
      background: #1d4ed8;
    }

    .btn-secondary {
      background: white;
      color: #2563eb;
      font-weight: 500;
      padding: 0.5rem 1rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      text-decoration: none;
      font-size: 0.875rem;
      transition: all 0.2s ease;
      display: inline-block;
      text-align: center;
    }

    .btn-secondary:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    .btn-ghost {
      background: transparent;
      color: #6b7280;
      font-weight: 500;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-ghost:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    .btn-active {
      background: #f3f4f6;
      color: #1f2937;
    }

    .dropdown {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .dropdown-item {
      display: block;
      padding: 0.5rem 1rem;
      color: #6b7280;
      text-decoration: none;
      transition: all 0.2s ease;
      font-size: 0.875rem;
    }

    .dropdown-item:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    .mobile-nav-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      color: #6b7280;
      text-decoration: none;
      font-weight: 500;
      border-radius: 0.5rem;
      transition: all 0.2s ease;
    }

    .mobile-nav-link:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    .mobile-nav-active {
      background: #eff6ff;
      color: #2563eb;
    }
  `]
})
export class HeaderComponent implements OnInit {
  user: User | null = null;
  showMobileMenu = false;
  showUserMenu = false;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.user = user;
      // Close mobile menu when user state changes
      this.showMobileMenu = false;
    });
  }

  getFirstName(fullName: string): string {
    return fullName?.split(' ')[0] || 'User';
  }

  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;
    this.showUserMenu = false; // Close user menu when opening mobile menu
  }

  closeMobileMenu() {
    this.showMobileMenu = false;
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
    this.showMobileMenu = false; // Close mobile menu when opening user menu
  }

  closeUserMenu() {
    this.showUserMenu = false;
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.showMobileMenu = false;
      this.showUserMenu = false;
    });
  }
}