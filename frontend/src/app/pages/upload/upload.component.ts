// File: frontend/src/app/pages/upload/upload.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { CVWizardComponent } from '../../components/cv-wizard/cv-wizard.component';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, CVWizardComponent],
  template: `
    <div class="relative min-h-[calc(100vh-4rem)] overflow-x-hidden py-4 md:py-8 w-full max-w-full flex items-center" style="background: #0a0e27;">
      <!-- 3D Floating Orbs (hidden on mobile) -->
      <div class="floating-orb orb-purple hidden md:block" style="width: 350px; height: 350px; top: 15%; left: 5%; animation-delay: 0s;"></div>
      <div class="floating-orb orb-cyan hidden md:block" style="width: 300px; height: 300px; bottom: 15%; right: 5%; animation-delay: 3s;"></div>
      <div class="floating-orb orb-pink hidden md:block" style="width: 250px; height: 250px; top: 50%; left: 50%; animation-delay: 6s;"></div>

      <div class="container mx-auto px-4 md:px-6 relative z-10 w-full">
        <!-- Authentication Check -->
        <div *ngIf="!isAuthenticated" class="max-w-sm md:max-w-md mx-auto">
          <div class="glass rounded-2xl p-5 md:p-8 text-center shadow-2xl animate-fade-in" style="background: rgba(26, 31, 58, 0.8); border: 2px solid rgba(167, 139, 250, 0.3);">
            <div class="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center"
                 style="box-shadow: 0 0 40px rgba(167, 139, 250, 0.5);">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <h1 class="text-2xl md:text-3xl font-bold text-gradient mb-3 md:mb-4">Login Required</h1>
            <p class="text-sm md:text-base text-white/70 mb-6 md:mb-8">
              Please log in to upload your CV and generate a landing page.
            </p>
            <button (click)="goToLogin()" class="btn-primary w-full text-sm md:text-base py-3 md:py-4">
              Sign In to Continue
            </button>
          </div>
        </div>

        <!-- CV Wizard -->
        <div *ngIf="isAuthenticated">
          <app-cv-wizard></app-cv-wizard>
        </div>
      </div>
    </div>
  `
})
export class UploadComponent implements OnInit {
  isAuthenticated = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}