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
    <header class="warm-header sticky top-0 z-50 fade-in">
      <nav class="container">
        <div class="flex justify-between items-center py-4">
          <!-- Logo - Warm and friendly -->
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-gradient rounded-xl flex items-center justify-center shadow-lg warm-logo">
              <div class="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                <span class="text-warm-orange font-bold text-sm">CV</span>
              </div>
            </div>
            <div>
              <h1 class="text-xl font-bold warm-text-primary">CVLanding</h1>
              <p class="text-sm warm-text-secondary -mt-1">Create • Share • Shine</p>
            </div>
          </div>

          <!-- Navigation - Clean and readable -->
          <div class="hidden md:flex items-center space-x-2">
            <a routerLink="/home" 
               routerLinkActive="active" 
               [routerLinkActiveOptions]="{exact: true}"
               class="warm-nav-link">
              Home
            </a>
            
            <a *ngIf="user" 
               routerLink="/dashboard" 
               routerLinkActive="active"
               class="warm-nav-link">
              Dashboard
            </a>

            <a *ngIf="user" 
               routerLink="/upload" 
               routerLinkActive="active"
               class="warm-nav-link">
              Create
            </a>

            <a *ngIf="!user" 
               routerLink="/test" 
               routerLinkActive="active"
               class="warm-nav-link">
              Test API
            </a>
          </div>

          <!-- User Actions - Warm styling -->
          <div class="flex items-center space-x-3">
            <!-- Mobile Menu Button -->
            <button *ngIf="!user" 
                    (click)="toggleMobileMenu()" 
                    class="md:hidden warm-btn-ghost p-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>

            <!-- Auth Buttons -->
            <div *ngIf="!user" class="hidden md:flex items-center space-x-3">
              <a routerLink="/login" class="warm-btn-secondary">
                Sign In
              </a>
              <a routerLink="/login" class="warm-btn-primary">
                Get Started
              </a>
            </div>

            <!-- User Menu -->
            <div *ngIf="user" class="flex items-center space-x-3">
              <div class="hidden md:flex items-center space-x-3">
                <div class="w-10 h-10 rounded-full overflow-hidden ring-2 ring-warm-coral shadow-md">
                  <img [src]="user.picture" [alt]="user.name" class="w-full h-full object-cover">
                </div>
                <div class="hidden lg:block">
                  <p class="text-sm font-semibold warm-text-primary">{{ getFirstName(user.name) }}</p>
                  <p class="text-xs warm-text-secondary">{{ user.email }}</p>
                </div>
              </div>
              
              <div class="relative">
                <button (click)="toggleUserMenu()" 
                        class="warm-btn-ghost p-2"
                        [class.warm-btn-active]="showUserMenu">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                
                <!-- Dropdown Menu -->
                <div *ngIf="showUserMenu" 
                     class="absolute right-0 mt-2 w-48 warm-dropdown scale-in z-50">
                  <div class="py-2">
                    <a routerLink="/dashboard" 
                       (click)="closeUserMenu()"
                       class="warm-dropdown-item">
                      Dashboard
                    </a>
                    <a routerLink="/upload" 
                       (click)="closeUserMenu()"
                       class="warm-dropdown-item">
                      Create Landing Page
                    </a>
                    <hr class="my-2 border-warm-peach">
                    <button (click)="logout()" 
                            class="warm-dropdown-item text-red-600 hover:bg-red-50 w-full text-left">
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
             class="md:hidden py-4 border-t border-warm-peach mt-4 slide-up">
          <div class="flex flex-col space-y-2">
            <a routerLink="/home" 
               (click)="closeMobileMenu()"
               class="warm-nav-link">
              Home
            </a>
            <a routerLink="/test" 
               (click)="closeMobileMenu()"
               class="warm-nav-link">
              Test API
            </a>
            <div class="pt-4 flex flex-col space-y-3">
              <a routerLink="/login" 
                 (click)="closeMobileMenu()"
                 class="warm-btn-secondary text-center">
                Sign In
              </a>
              <a routerLink="/login" 
                 (click)="closeMobileMenu()"
                 class="warm-btn-primary text-center">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>
    </header>
  `,
  styles: [`
    /* Component-specific warm styling */
    .warm-header {
      background: linear-gradient(135deg, #ffffff 0%, #fff4f1 100%);
      border-bottom: 3px solid #ff8a65;
      box-shadow: 0 4px 20px rgba(255, 107, 53, 0.1);
    }

    .warm-logo {
      background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 50%, #ffa726 100%);
    }

    .warm-text-primary {
      color: #3e2723;
      background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .warm-text-secondary {
      color: #5d4037;
    }

    .warm-nav-link {
      color: #5d4037;
      font-weight: 500;
      padding: 0.75rem 1.25rem;
      border-radius: 12px;
      transition: all 0.3s ease;
      text-decoration: none;
      font-size: 0.9rem;
    }

    .warm-nav-link:hover {
      color: #ff6b35;
      background: rgba(255, 244, 241, 0.8);
      transform: translateY(-1px);
    }

    .warm-nav-link.active {
      color: white;
      background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
      box-shadow: 0 4px 15px rgba(255, 107, 53, 0.25);
    }

    .warm-btn-primary {
      background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
      color: white;
      font-weight: 600;
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      border: none;
      text-decoration: none;
      font-size: 0.9rem;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(255, 107, 53, 0.15);
      display: inline-block;
      text-align: center;
    }

    .warm-btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 107, 53, 0.25);
      filter: brightness(1.05);
    }

    .warm-btn-secondary {
      background: white;
      color: #ff6b35;
      font-weight: 500;
      padding: 0.75rem 1.5rem;
      border: 2px solid #ff8a65;
      border-radius: 12px;
      text-decoration: none;
      font-size: 0.9rem;
      transition: all 0.3s ease;
      display: inline-block;
      text-align: center;
    }

    .warm-btn-secondary:hover {
      background: #fff4f1;
      border-color: #ff6b35;
      transform: translateY(-1px);
    }

    .warm-btn-ghost {
      background: transparent;
      color: #5d4037;
      font-weight: 500;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .warm-btn-ghost:hover {
      background: rgba(255, 244, 241, 0.8);
      color: #ff6b35;
    }

    .warm-btn-active {
      background: rgba(255, 244, 241, 0.8);
      color: #ff6b35;
    }

    .warm-dropdown {
      background: white;
      border: 1px solid rgba(255, 138, 101, 0.2);
      border-radius: 16px;
      box-shadow: 0 8px 30px rgba(255, 107, 53, 0.15);
      backdrop-filter: blur(20px);
    }

    .warm-dropdown-item {
      display: block;
      padding: 0.75rem 1rem;
      color: #5d4037;
      text-decoration: none;
      transition: all 0.3s ease;
      border-radius: 8px;
      margin: 0 0.5rem;
      font-size: 0.9rem;
    }

    .warm-dropdown-item:hover {
      background: #fff4f1;
      color: #ff6b35;
    }

    .ring-warm-coral {
      --tw-ring-color: #ff8a65;
    }

    .border-warm-peach {
      border-color: #ffb4a2;
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