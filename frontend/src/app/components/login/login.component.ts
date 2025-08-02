// File: frontend/src/app/components/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

declare global {
  interface Window {
    google: any;
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">

      <div class="max-w-md w-full">
        <!-- Header -->
        <div class="text-center mb-8 fade-in">
          <div class="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span class="text-white font-bold text-lg">CV</span>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p class="text-gray-600">
            Sign in to create and manage your professional landing pages
          </p>
        </div>

        <!-- Login Card -->
        <div class="card scale-in">
          <div class="space-y-6">
            <!-- Google Sign In Button -->
            <div>
              <div id="google-signin-button" class="w-full"></div>
            </div>

            <!-- Divider -->
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white text-gray-500">Fast & Secure</span>
              </div>
            </div>

            <!-- Features -->
            <div class="space-y-3">
              <div class="flex items-center text-sm text-gray-600">
                <div class="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span class="text-xs text-green-600 font-bold">✓</span>
                </div>
                Create unlimited landing pages
              </div>
              <div class="flex items-center text-sm text-gray-600">
                <div class="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span class="text-xs text-green-600 font-bold">✓</span>
                </div>
                AI-powered content generation
              </div>
              <div class="flex items-center text-sm text-gray-600">
                <div class="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span class="text-xs text-green-600 font-bold">✓</span>
                </div>
                Mobile-responsive designs
              </div>
            </div>

            <!-- Loading State -->
            <div *ngIf="loading" class="text-center py-4">
              <div class="flex items-center justify-center space-x-3">
                <div class="loading-spinner"></div>
                <span class="text-gray-600">Signing you in...</span>
              </div>
            </div>

            <!-- Error Message -->
            <div *ngIf="error" class="status-error">
              <div class="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                <span class="text-xs text-red-600 font-bold">!</span>
              </div>
              <div>
                <h3 class="font-medium">Authentication Error</h3>
                <p class="text-sm mt-1">{{ error }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="text-center mt-8 space-y-4 fade-in">
          <p class="text-sm text-gray-500">
            By signing in, you agree to our 
            <a href="#" class="text-blue-600 hover:text-blue-700 font-medium">Terms of Service</a>
            and 
            <a href="#" class="text-blue-600 hover:text-blue-700 font-medium">Privacy Policy</a>
          </p>
          
          <div class="flex items-center justify-center space-x-6 text-xs text-gray-400">
            <div class="flex items-center">
              <div class="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              256-bit SSL
            </div>
            <div class="flex items-center">
              <div class="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              Privacy Protected
            </div>
            <div class="flex items-center">
              <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Secure
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  loading = false;
  error: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadGoogleSignIn();
  }

  private loadGoogleSignIn() {
    this.createMockGoogleButton();
  }

  private createMockGoogleButton() {
    const button = document.getElementById('google-signin-button');
    if (button) {
      button.innerHTML = `
        <button class="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-md">
          <div class="w-5 h-5 bg-blue-500 rounded mr-3 flex items-center justify-center">
            <span class="text-white text-xs font-bold">G</span>
          </div>
          Continue with Google
        </button>
      `;
      
      const btn = button.querySelector('button');
      if (btn) {
        btn.addEventListener('click', () => this.mockGoogleLogin());
      }
    }
  }

  private mockGoogleLogin() {
    this.loading = true;
    this.error = null;

    const mockCredential = 'mock_google_jwt_token_for_testing';
    
    setTimeout(() => {
      this.authService.login(mockCredential).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.router.navigate(['/dashboard']);
          } else {
            this.error = 'Login failed. Please try again.';
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = error.error?.message || 'An error occurred during login.';
        }
      });
    }, 1500);
  }
}