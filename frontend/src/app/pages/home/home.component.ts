import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Hero Section -->
    <section class="relative min-h-screen flex items-center justify-center overflow-hidden" style="background: #0a0e27;">
      <!-- 3D Floating Orbs -->
      <div class="floating-orb orb-purple" style="width: 300px; height: 300px; top: 10%; left: 10%; animation-delay: 0s;"></div>
      <div class="floating-orb orb-cyan" style="width: 250px; height: 250px; top: 60%; right: 15%; animation-delay: 2s;"></div>
      <div class="floating-orb orb-pink" style="width: 200px; height: 200px; bottom: 20%; left: 60%; animation-delay: 4s;"></div>

      <div class="container px-4 md:px-6 relative z-10 py-20">
        <div class="max-w-6xl mx-auto text-center animate-fade-in">
          <h1 class="text-5xl md:text-7xl lg:text-8xl font-black mb-12 leading-tight text-gradient text-glow">
            CV Landing Page Generator
          </h1>

          <!-- How It Works Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-7xl mx-auto mt-20">
            <!-- Step 1 -->
            <div class="card text-center animate-slide-up group" style="animation-delay: 0.1s;">
              <div class="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                   style="box-shadow: 0 0 40px rgba(167, 139, 250, 0.5);">
                <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-white mb-4">1. Upload CV</h3>
              <p class="text-white/70 text-lg leading-relaxed">
                Drag and drop your CV file (PDF, DOC, DOCX) and add a professional photo
              </p>
            </div>

            <!-- Step 2 -->
            <div class="card text-center animate-slide-up group" style="animation-delay: 0.3s;">
              <div class="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                   style="box-shadow: 0 0 40px rgba(34, 211, 238, 0.5);">
                <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a9 9 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-white mb-4">2. AI Processing</h3>
              <p class="text-white/70 text-lg leading-relaxed">
                Our AI analyzes and generates compelling professional content
              </p>
            </div>

            <!-- Step 3 -->
            <div class="card text-center animate-slide-up group" style="animation-delay: 0.5s;">
              <div class="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                   style="box-shadow: 0 0 40px rgba(244, 114, 182, 0.5);">
                <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"/>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-white mb-4">3. Launch</h3>
              <p class="text-white/70 text-lg leading-relaxed">
                Customize and publish your beautiful, responsive landing page
              </p>
            </div>
          </div>

          <!-- CTA Button -->
          <div class="flex justify-center mt-16">
            <button (click)="navigateToUpload()" class="btn-primary text-xl px-12 py-6 inline-flex items-center justify-center cursor-pointer">
              <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Get Started
            </button>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HomeComponent {
  constructor(private router: Router) {}

  navigateToUpload() {
    this.router.navigate(['/upload']).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}
