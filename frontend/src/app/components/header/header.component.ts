import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="glass sticky top-0 z-50 backdrop-blur-md" style="background: rgba(10, 14, 39, 0.8); border-bottom: 1px solid rgba(167, 139, 250, 0.2); overflow: visible;">
      <nav class="container h-full">
        <div class="flex justify-between items-center h-full px-3 md:px-4 py-2 md:py-4" style="overflow: visible;">
          <!-- Logo -->
          <div class="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
            <img src="assets/hadar-logo.png" alt="Hadar Logo" class="h-10 md:h-16 flex-shrink-0"
                 style="width: auto;">
            <div class="min-w-0 flex-1">
              <h1 class="text-base md:text-2xl font-black text-gradient">CV Landing Generator</h1>
              <p class="text-xs md:text-sm text-white/60 hidden sm:block">Create • Share • Shine</p>
            </div>
          </div>

          <!-- Navigation -->
          <div class="hidden md:flex items-center space-x-6">
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
          <div class="flex items-center space-x-3 flex-shrink-0">
            <!-- Mobile Menu Button -->
            <button *ngIf="!user"
                    (click)="toggleMobileMenu()"
                    class="md:hidden p-2 rounded-lg glass hover:bg-purple-500/10">
              Menu
            </button>

            <!-- Auth Buttons -->
            <div *ngIf="!user" class="hidden md:flex items-center space-x-3">
              <a routerLink="/login" class="btn-secondary text-sm px-6 py-2.5">
                Sign In
              </a>
              <a routerLink="/login" class="btn-primary text-sm px-6 py-2.5">
                Get Started
              </a>
            </div>

            <!-- User Menu -->
            <div *ngIf="user" class="relative flex items-center space-x-3 user-menu-container">
              <!-- User Profile Button -->
              <button (click)="toggleUserMenu($event)"
                      class="hidden md:flex items-center space-x-3 p-2 rounded-lg hover:bg-purple-500/10 transition-colors"
                      style="background: transparent;">
                <div class="w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-400 flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-500" style="box-shadow: 0 0 20px rgba(167, 139, 250, 0.4);">
                  <img *ngIf="user.picture" [src]="user.picture" [alt]="user.name" class="w-full h-full object-cover" (error)="imageError($event)">
                  <span *ngIf="!user.picture" class="text-white font-bold text-sm">{{ getInitials(user.name) }}</span>
                </div>
                <div class="hidden lg:block text-left">
                  <p class="text-sm font-semibold text-white">{{ getFirstName(user.name) }}</p>
                  <p class="text-xs text-white/60">{{ user.email }}</p>
                </div>
                <svg class="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              <!-- User Dropdown Menu -->
              <div *ngIf="showUserMenu"
                   class="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl overflow-hidden backdrop-blur-md"
                   style="background: rgba(26, 31, 58, 0.95); border: 1px solid rgba(167, 139, 250, 0.3); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); z-index: 9999;">
                <div class="py-2">
                  <button (click)="logout(); closeUserMenu()"
                          class="w-full text-left px-4 py-3 text-sm text-red-400
                                 hover:bg-red-500/10 transition-colors flex items-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              <!-- Mobile Menu Button for authenticated users -->
              <button (click)="toggleMobileMenu()"
                      class="md:hidden p-2 rounded-lg glass hover:bg-purple-500/10">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Menu -->
        <div *ngIf="showMobileMenu"
             class="md:hidden glass border-t"
             style="border-color: rgba(167, 139, 250, 0.2);">
          <div class="px-4 py-6">
            <!-- Navigation Links -->
            <div class="space-y-2 mb-6">
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
            <div *ngIf="user" class="border-t pt-6" style="border-color: rgba(167, 139, 250, 0.2);">
              <!-- User Info -->
              <div class="flex items-center space-x-3 mb-4 p-3 glass rounded-xl">
                <div class="w-12 h-12 rounded-full overflow-hidden ring-2 ring-purple-400 flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-500">
                  <img *ngIf="user.picture" [src]="user.picture" [alt]="user.name" class="w-full h-full object-cover" (error)="imageError($event)">
                  <span *ngIf="!user.picture" class="text-white font-bold">{{ getInitials(user.name) }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-white truncate">{{ user.name }}</p>
                  <p class="text-xs text-white/60 truncate">{{ user.email }}</p>
                </div>
              </div>

              <!-- Sign Out Button -->
              <button (click)="logout(); closeMobileMenu()"
                      class="w-full flex items-center justify-center space-x-2 px-4 py-3
                             text-red-400
                             bg-red-500/10
                             border border-red-500/30
                             rounded-xl hover:bg-red-500/20 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                <span class="font-medium">Sign Out</span>
              </button>
            </div>

            <!-- Non-authenticated user options -->
            <div *ngIf="!user" class="border-t pt-6 space-y-3" style="border-color: rgba(167, 139, 250, 0.2);">
              <a routerLink="/login"
                 (click)="closeMobileMenu()"
                 class="w-full flex items-center justify-center space-x-2 px-4 py-3 btn-secondary rounded-xl">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                </svg>
                <span class="font-medium">Sign In</span>
              </a>

              <a routerLink="/login"
                 (click)="closeMobileMenu()"
                 class="w-full flex items-center justify-center space-x-2 px-4 py-3 btn-primary rounded-xl">
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
      color: rgba(255, 255, 255, 0.7);
      font-weight: 500;
      padding: 0.5rem 1rem;
      border-radius: 10px;
      transition: all 0.3s ease;
      text-decoration: none;
      font-size: 0.95rem;
    }

    .nav-link:hover {
      color: #a78bfa;
      background: rgba(167, 139, 250, 0.1);
      transform: translateY(-1px);
    }

    .nav-link.active {
      color: #a78bfa;
      background: rgba(167, 139, 250, 0.15);
    }

    .mobile-nav-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      color: rgba(255, 255, 255, 0.7);
      text-decoration: none;
      font-weight: 500;
      border-radius: 10px;
      transition: all 0.3s ease;
    }

    .mobile-nav-link:hover {
      background: rgba(167, 139, 250, 0.1);
      color: #a78bfa;
    }

    .mobile-nav-active {
      background: rgba(167, 139, 250, 0.15);
      color: #a78bfa;
    }
  `],
  animations: []
})
export class HeaderComponent implements OnInit {
  user: User | null = null;
  showMobileMenu = false;
  showUserMenu = false;

  constructor(
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.user = user;
      this.showMobileMenu = false;
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.user-menu-container');

    if (!clickedInside && this.showUserMenu) {
      this.showUserMenu = false;
    }
  }

  getFirstName(fullName: string): string {
    return fullName?.split(' ')[0] || 'User';
  }

  getInitials(fullName: string): string {
    if (!fullName) return 'U';
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  imageError(event: Event) {
    // Hide image when it fails to load
    const img = event.target as HTMLImageElement;
    if (this.user) {
      this.user.picture = '';
    }
  }

  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;
    this.showUserMenu = false;
  }

  closeMobileMenu() {
    this.showMobileMenu = false;
  }

  toggleUserMenu(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.showUserMenu = !this.showUserMenu;
    this.showMobileMenu = false;
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
