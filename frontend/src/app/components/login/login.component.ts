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
    <div class="relative min-h-screen flex items-center justify-center overflow-hidden py-12 px-4" style="background: #0a0e27;">
      <!-- 3D Floating Orbs -->
      <div class="floating-orb orb-purple" style="width: 400px; height: 400px; top: -10%; left: -5%; animation-delay: 0s;"></div>
      <div class="floating-orb orb-cyan" style="width: 350px; height: 350px; bottom: -10%; right: -5%; animation-delay: 3s;"></div>
      <div class="floating-orb orb-pink" style="width: 300px; height: 300px; top: 50%; left: 50%; animation-delay: 6s;"></div>

      <div class="max-w-md w-full relative z-10">
        <!-- Header -->
        <div class="text-center mb-6 md:mb-8 animate-fade-in">
          <div class="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center"
               style="box-shadow: 0 0 40px rgba(167, 139, 250, 0.5);">
            <span class="text-white font-bold text-xl md:text-2xl">CV</span>
          </div>
          <h1 class="text-2xl md:text-4xl font-bold text-gradient mb-2 md:mb-3 px-4">Welcome Back</h1>
          <p class="text-white/70 text-sm md:text-lg px-4">
            Sign in to create and manage your professional landing pages
          </p>
        </div>

        <!-- Login Card -->
        <div class="glass rounded-2xl p-8 shadow-2xl animate-slide-up" style="background: rgba(26, 31, 58, 0.8); border: 2px solid rgba(167, 139, 250, 0.3);">
          <div class="space-y-6">
            <!-- Google Sign In Button -->
            <div>
              <div id="google-signin-button" class="w-full"></div>
            </div>

            <!-- Divider -->
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t" style="border-color: rgba(167, 139, 250, 0.2);"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-3 text-white/80 font-medium" style="background: rgba(26, 31, 58, 0.9);">Fast & Secure</span>
              </div>
            </div>

            <!-- Features -->
            <div class="space-y-3">
              <div class="flex items-center text-sm text-white/80">
                <div class="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0" style="border: 1px solid rgba(34, 197, 94, 0.3);">
                  <span class="text-xs text-green-400 font-bold">✓</span>
                </div>
                Create your own landing pages
              </div>
              <div class="flex items-center text-sm text-white/80">
                <div class="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0" style="border: 1px solid rgba(34, 197, 94, 0.3);">
                  <span class="text-xs text-green-400 font-bold">✓</span>
                </div>
                AI-powered content generation
              </div>
              <div class="flex items-center text-sm text-white/80">
                <div class="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0" style="border: 1px solid rgba(34, 197, 94, 0.3);">
                  <span class="text-xs text-green-400 font-bold">✓</span>
                </div>
                You own the code
              </div>
            </div>

            <!-- Loading State -->
            <div *ngIf="loading" class="text-center py-4">
              <div class="flex items-center justify-center space-x-3">
                <div class="wizard-spinner"></div>
                <span class="text-white/80">Signing you in...</span>
              </div>
            </div>

            <!-- Error Message -->
            <div *ngIf="error" class="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start">
              <div class="w-5 h-5 bg-red-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span class="text-xs text-red-400 font-bold">!</span>
              </div>
              <div>
                <h3 class="font-medium text-red-400">Authentication Error</h3>
                <p class="text-sm mt-1 text-red-400/80">{{ error }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="text-center mt-8 space-y-4 animate-fade-in">
          <p class="text-sm text-white/60">
            By signing in, you agree to our
            <a href="#" class="text-purple-400 hover:text-purple-300 font-medium underline">Terms of Service</a>
            and
            <a href="#" class="text-purple-400 hover:text-purple-300 font-medium underline">Privacy Policy</a>
          </p>

          <div class="flex items-center justify-center space-x-6 text-xs text-white/50">
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
    this.authService.getGoogleClientId().subscribe({
      next: (config: any) => {
        if (config.googleClientId) {
          this.initializeGoogleSignIn(config.googleClientId);
        } else {
          this.error = 'Google authentication is not configured.';
        }
      },
      error: (error) => {
        console.error('Failed to load Google config:', error);
        this.error = 'Failed to load authentication configuration.';
      }
    });
  }

  private initializeGoogleSignIn(clientId: string) {
    const checkGoogle = () => {
      if (typeof window.google !== 'undefined') {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: this.handleGoogleCallback.bind(this)
        });

        const buttonWidth = window.innerWidth < 768 ? Math.min(window.innerWidth - 80, 350) : 400;

        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'outline',
            size: 'large',
            width: buttonWidth,
            text: 'continue_with'
          }
        );
      } else {
        setTimeout(checkGoogle, 100);
      }
    };
    checkGoogle();
  }

  private handleGoogleCallback(response: any) {
    if (response.credential) {
      this.loading = true;
      this.error = null;

      this.authService.login(response.credential).subscribe({
        next: (loginResponse) => {
          this.loading = false;
          if (loginResponse.success) {
            this.router.navigate(['/dashboard']);
          } else {
            this.error = 'Login failed. Please try again.';
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = error.error?.error || error.error?.message || 'An error occurred during login.';
        }
      });
    }
  }
}