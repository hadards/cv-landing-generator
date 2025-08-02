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
    <header class="bg-white border-b border-gray-200 sticky top-0 z-50">
      <nav class="container">
        <div class="flex justify-between items-center py-4">
          <!-- Logo -->
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">CV</span>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900">CVLanding</h1>
              <p class="text-sm text-gray-600 -mt-1">Create • Share • Shine</p>
            </div>
          </div>

          <!-- Navigation -->
          <div class="hidden md:flex items-center space-x-2">
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

            <a *ngIf="!user" 
               routerLink="/test" 
               routerLinkActive="active"
               class="nav-link">
              Test API
            </a>
          </div>

          <!-- User Actions -->
          <div class="flex items-center space-x-3">
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
            <div *ngIf="user" class="flex items-center space-x-3">
              <div class="hidden md:flex items-center space-x-3">
                <div class="w-10 h-10 rounded-full overflow-hidden ring-2 ring-blue-500 shadow-md">
                  <img [src]="user.picture" [alt]="user.name" class="w-full h-full object-cover">
                </div>
                <div class="hidden lg:block">
                  <p class="text-sm font-semibold text-gray-900">{{ getFirstName(user.name) }}</p>
                  <p class="text-xs text-gray-600">{{ user.email }}</p>
                </div>
              </div>
              
              <div class="relative">
                <button (click)="toggleUserMenu()" 
                        class="btn-ghost p-2"
                        [class.btn-active]="showUserMenu">
                  ▼
                </button>
                
                <!-- Dropdown Menu -->
                <div *ngIf="showUserMenu" 
                     class="absolute right-0 mt-2 w-48 dropdown z-50">
                  <div class="py-2">
                    <a routerLink="/upload" 
                       (click)="closeUserMenu()"
                       class="dropdown-item">
                      Create Landing Page
                    </a>
                    <hr class="my-2 border-gray-200">
                    <button (click)="logout()" 
                            class="dropdown-item text-red-600 hover:bg-red-50 w-full text-left">
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile Menu -->
        <div *ngIf="showMobileMenu && !user" 
             class="md:hidden py-4 border-t border-gray-200 mt-4">
          <div class="flex flex-col space-y-2">
            <a routerLink="/home" 
               (click)="closeMobileMenu()"
               class="nav-link">
              Home
            </a>
            <a routerLink="/test" 
               (click)="closeMobileMenu()"
               class="nav-link">
              Test API
            </a>
            <div class="pt-4 flex flex-col space-y-3">
              <a routerLink="/login" 
                 (click)="closeMobileMenu()"
                 class="btn-secondary text-center">
                Sign In
              </a>
              <a routerLink="/login" 
                 (click)="closeMobileMenu()"
                 class="btn-primary text-center">
                Get Started
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
  `]
})
export class HeaderComponent implements OnInit {
  user: User | null = null;
  showUserMenu = false;
  showMobileMenu = false;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.user = user;
      if (user) {
        this.showMobileMenu = false;
      }
    });
  }

  getFirstName(fullName: string): string {
    return fullName?.split(' ')[0] || 'User';
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
    this.showMobileMenu = false;
  }

  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;
    this.showUserMenu = false;
  }

  closeUserMenu() {
    this.showUserMenu = false;
  }

  closeMobileMenu() {
    this.showMobileMenu = false;
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.showUserMenu = false;
    });
  }
}