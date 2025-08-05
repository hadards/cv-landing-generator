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
    <div class="min-h-screen bg-gray-50 py-4 md:py-8">
      <div class="container mx-auto px-4 md:px-6">
        <!-- Authentication Check -->
        <div *ngIf="!isAuthenticated" class="max-w-sm md:max-w-md mx-auto">
          <div class="card text-center p-4 md:p-6">
            <h1 class="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">Login Required</h1>
            <p class="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
              Please log in to upload your CV and generate a landing page.
            </p>
            <button (click)="goToLogin()" class="btn-primary w-full text-sm md:text-base py-2.5 md:py-3">
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