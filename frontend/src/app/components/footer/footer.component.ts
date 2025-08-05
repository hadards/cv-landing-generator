// File: frontend/src/app/components/footer/footer.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="bg-gray-50 border-t border-gray-200 mt-auto">
      <div class="container py-4">
        <!-- Main Footer Content -->
        <div class="flex flex-col md:flex-row items-center justify-between">
          <!-- Brand Section -->
          <div class="flex items-center space-x-4 mb-6 md:mb-0">
            <img src="assets/hadar-logo.png" alt="Hadar Logo" class="h-32" style="width: auto; min-width: 128px;">
            <div>
              <h3 class="text-lg font-bold text-gray-900">CV to Landing</h3>
              <p class="text-sm text-gray-600">Generate • Share • Shine</p>
            </div>
          </div>
          
          <!-- Description -->
          <div class="text-center md:text-right max-w-md">
            <p class="text-gray-600 text-sm leading-relaxed">
              Transform your CV into a stunning, professional landing page in minutes with AI-powered content generation.
            </p>
          </div>
        </div>

        <!-- Bottom Bar -->
        <div class="flex flex-col md:flex-row justify-between items-center pt-4 mt-4 border-t border-gray-300">
          <p class="text-sm text-gray-500 mb-2 md:mb-0">
            © 2025 ARTech. All rights reserved.
          </p>
          
          <div class="flex items-center space-x-4 text-xs text-gray-400">
            <span>Powered by AI</span>
            <span>•</span>
            <div class="flex items-center space-x-1">
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  `
})
export class FooterComponent {
}