// File: frontend/src/app/pages/home/home.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
      <div class="container">
        <div class="max-w-4xl mx-auto text-center fade-in">
          <div class="mb-8">
            <div class="inline-flex items-center px-4 py-2 bg-white/80 rounded-full shadow-sm border border-gray-200 mb-6">
              <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              <span class="text-sm font-medium text-gray-700">AI-Powered • Fast • Professional</span>
            </div>
            
            <h1 class="text-5xl md:text-6xl font-bold mb-6">
              <span class="text-gray-900">Transform Your</span>
              <br>
              <span class="text-gradient">CV into a Stunning</span>
              <br>
              <span class="text-gray-900">Landing Page</span>
            </h1>
            
            <p class="text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
              Upload your CV and let our AI create a beautiful, responsive landing page that showcases your professional story in minutes.
            </p>
            
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <a routerLink="/upload" class="btn-primary text-lg px-8 py-4">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                Create Your Landing Page
              </a>
              <button class="btn-secondary text-lg px-8 py-4">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                See Examples
              </button>
            </div>
          </div>
          
          <!-- Stats -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div class="text-center slide-up" style="animation-delay: 0.2s">
              <div class="text-3xl font-bold text-gradient mb-2">< 2 min</div>
              <div class="text-gray-600">Average Creation Time</div>
            </div>
            <div class="text-center slide-up" style="animation-delay: 0.4s">
              <div class="text-3xl font-bold text-gradient mb-2">100%</div>
              <div class="text-gray-600">Mobile Responsive</div>
            </div>
            <div class="text-center slide-up" style="animation-delay: 0.6s">
              <div class="text-3xl font-bold text-gradient mb-2">AI</div>
              <div class="text-gray-600">Powered Content</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Background decoration -->
      <div class="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div class="absolute top-20 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div class="absolute top-40 right-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style="animation-delay: 2s"></div>
        <div class="absolute -bottom-32 left-40 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style="animation-delay: 4s"></div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="section-padding bg-white">
      <div class="container">
        <div class="text-center mb-16 fade-in">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Create your professional landing page in just three simple steps
          </p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          <!-- Step 1 -->
          <div class="text-center slide-up" style="animation-delay: 0.1s">
            <div class="w-20 h-20 bg-gradient rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">1. Upload Your CV</h3>
            <p class="text-gray-600 leading-relaxed">
              Simply drag and drop your CV file (PDF, DOC, or DOCX) and optionally add a professional photo
            </p>
          </div>
          
          <!-- Step 2 -->
          <div class="text-center slide-up" style="animation-delay: 0.3s">
            <div class="w-20 h-20 bg-gradient rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a9 9 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">2. AI Magic</h3>
            <p class="text-gray-600 leading-relaxed">
              Our AI analyzes your CV and generates compelling, professional content optimized for web presentation
            </p>
          </div>
          
          <!-- Step 3 -->
          <div class="text-center slide-up" style="animation-delay: 0.5s">
            <div class="w-20 h-20 bg-gradient rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"/>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">3. Customize & Launch</h3>
            <p class="text-gray-600 leading-relaxed">
              Review, edit your content, and launch your beautiful, mobile-responsive professional landing page
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="section-padding bg-gray-50">
      <div class="container">
        <div class="text-center mb-16 fade-in">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Choose CVLanding?
          </h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional features designed to make you stand out
          </p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <!-- Feature 1 -->
          <div class="card-compact text-center slide-up" style="animation-delay: 0.1s">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Mobile Responsive</h3>
            <p class="text-gray-600 text-sm">Perfect on any device - desktop, tablet, or mobile</p>
          </div>
          
          <!-- Feature 2 -->
          <div class="card-compact text-center slide-up" style="animation-delay: 0.2s">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Lightning Fast</h3>
            <p class="text-gray-600 text-sm">Generate your landing page in under 2 minutes</p>
          </div>
          
          <!-- Feature 3 -->
          <div class="card-compact text-center slide-up" style="animation-delay: 0.3s">
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a9 9 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">AI-Powered</h3>
            <p class="text-gray-600 text-sm">Smart content generation that understands your career</p>
          </div>
          
          <!-- Feature 4 -->
          <div class="card-compact text-center slide-up" style="animation-delay: 0.4s">
            <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2.5 2.5 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Fully Customizable</h3>
            <p class="text-gray-600 text-sm">Edit and personalize every section to match your style</p>
          </div>
          
          <!-- Feature 5 -->
          <div class="card-compact text-center slide-up" style="animation-delay: 0.5s">
            <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Professional Design</h3>
            <p class="text-gray-600 text-sm">Clean, modern templates that impress employers</p>
          </div>
          
          <!-- Feature 6 -->
          <div class="card-compact text-center slide-up" style="animation-delay: 0.6s">
            <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Easy Sharing</h3>
            <p class="text-gray-600 text-sm">Share your landing page with a simple, clean URL</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="section-padding bg-gradient-to-r from-blue-600 to-purple-600">
      <div class="container">
        <div class="text-center text-white fade-in">
          <h2 class="text-3xl md:text-4xl font-bold mb-4">
            Ready to Create Your Professional Landing Page?
          </h2>
          <p class="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Join thousands of professionals who have transformed their careers with stunning landing pages
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a routerLink="/upload" class="bg-white text-blue-600 hover:bg-gray-50 font-semibold py-4 px-8 rounded-lg transition-colors text-lg">
              Get Started Free
            </a>
            <a routerLink="/login" class="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold py-4 px-8 rounded-lg transition-colors text-lg">
              Sign In
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer CTA -->
    <section class="py-12 bg-white border-t border-gray-200">
      <div class="container">
        <div class="text-center">
          <p class="text-gray-600 mb-4">
            Transform your CV into a stunning landing page in minutes
          </p>
          <a routerLink="/upload" class="btn-primary">
            Start Creating Now
          </a>
        </div>
      </div>
    </section>
  `
})
export class HomeComponent {
}