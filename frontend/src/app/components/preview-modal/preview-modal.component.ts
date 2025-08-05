// File: frontend/src/app/components/preview-modal/preview-modal.component.ts
// Complete preview modal component from scratch

import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-preview-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Modal Overlay -->
    <div *ngIf="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      
      <!-- Modal Content -->
      <div class="relative w-full max-w-6xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden">
        
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Website Preview</h3>
          
          <!-- Device Toggle -->
          <div class="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              (click)="setDevice('desktop')"
              [class.bg-white]="device === 'desktop'"
              [class.shadow-sm]="device === 'desktop'"
              class="px-3 py-1 rounded text-sm font-medium text-gray-700">
              Desktop
            </button>
            <button
              (click)="setDevice('tablet')"
              [class.bg-white]="device === 'tablet'"
              [class.shadow-sm]="device === 'tablet'"
              class="px-3 py-1 rounded text-sm font-medium text-gray-700">
              Tablet
            </button>
            <button
              (click)="setDevice('mobile')"
              [class.bg-white]="device === 'mobile'"
              [class.shadow-sm]="device === 'mobile'"
              class="px-3 py-1 rounded text-sm font-medium text-gray-700">
              Mobile
            </button>
          </div>
          
          <!-- Actions -->
          <div class="flex items-center space-x-3">
            <button
              (click)="downloadWebsite()"
              [disabled]="isDownloading"
              class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50">
              {{ isDownloading ? 'Downloading...' : 'Download' }}
            </button>
            <button
              (click)="closeModal()"
              class="p-2 text-gray-400 hover:text-gray-600 rounded">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Preview Area -->
        <div class="p-4 bg-gray-50">
          
          <!-- Loading State -->
          <div *ngIf="isLoading" class="flex items-center justify-center h-96">
            <div class="text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p class="text-gray-600">Loading preview...</p>
            </div>
          </div>
          
          <!-- Error State -->
          <div *ngIf="error" class="flex items-center justify-center h-96">
            <div class="text-center text-red-600">
              <p class="font-medium">Preview Error</p>
              <p class="text-sm mt-1">{{ error }}</p>
              <button 
                (click)="loadPreview()" 
                class="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                Try Again
              </button>
            </div>
          </div>
          
          <!-- Preview Content -->
          <div *ngIf="!isLoading && !error" class="flex justify-center">
            <div [ngClass]="getDeviceClasses()" class="bg-white rounded-lg shadow-lg overflow-hidden">
              <iframe
                [src]="previewUrl"
                class="w-full border-0"
                [style.height]="getDeviceHeight()"
                frameborder="0">
              </iframe>
            </div>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div class="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-600">Your landing page is ready to download and deploy</p>
            <div class="flex space-x-3">
              <button 
                (click)="closeModal()" 
                class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50">
                Close
              </button>
              <button 
                (click)="downloadWebsite()" 
                [disabled]="isDownloading"
                class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50">
                Download Files
              </button>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  `,
  styles: [`
    /* Modal specific styles */
    .fixed {
      position: fixed;
    }
    
    .inset-0 {
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
    }
    
    .z-50 {
      z-index: 50;
    }
    
    .bg-black {
      background-color: rgb(0 0 0);
    }
    
    .bg-opacity-50 {
      background-color: rgb(0 0 0 / 0.5);
    }
    
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class PreviewModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() generationId: string | null = null;
  @Output() closeEvent = new EventEmitter<void>();
  @Output() downloadEvent = new EventEmitter<string>();

  isLoading = false;
  error: string | null = null;
  previewUrl: SafeResourceUrl | null = null;
  device: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  isDownloading = false;

  constructor(
    private sanitizer: DomSanitizer,
    private authService: AuthService
  ) {}

  ngOnInit() {
    if (this.isOpen && this.generationId) {
      this.loadPreview();
    }
  }

  ngOnChanges() {
    if (this.isOpen && this.generationId) {
      this.loadPreview();
    }
  }

  loadPreview() {
    if (!this.generationId) {
      this.error = 'No generation ID provided';
      return;
    }

    this.isLoading = true;
    this.error = null;

    // Get authentication token
    const token = this.authService.getToken();
    if (!token) {
      this.error = 'Authentication required';
      this.isLoading = false;
      return;
    }

    // Create preview URL with token as query parameter for iframe access
    const url = `http://localhost:3000/api/cv/preview?previewId=${this.generationId}&token=${encodeURIComponent(token)}`;
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);

    // Simulate loading time
    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }

  setDevice(device: 'desktop' | 'tablet' | 'mobile') {
    this.device = device;
  }

  getDeviceClasses(): string {
    switch (this.device) {
      case 'desktop':
        return 'w-full max-w-5xl';
      case 'tablet':
        return 'w-full max-w-2xl';
      case 'mobile':
        return 'w-full max-w-sm';
      default:
        return 'w-full';
    }
  }

  getDeviceHeight(): string {
    switch (this.device) {
      case 'desktop':
        return '600px';
      case 'tablet':
        return '700px';
      case 'mobile':
        return '500px';
      default:
        return '600px';
    }
  }

  closeModal() {
    this.closeEvent.emit();
  }

  downloadWebsite() {
    if (!this.generationId || this.isDownloading) return;

    this.isDownloading = true;

    // Get authentication token
    const token = this.authService.getToken();
    if (!token) {
      this.error = 'Authentication required for download';
      this.isDownloading = false;
      return;
    }

    // Create download URL with token
    const downloadUrl = `http://localhost:3000/api/cv/download?generationId=${this.generationId}&token=${encodeURIComponent(token)}`;
    
    // Trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'landing-page.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Emit download event
    this.downloadEvent.emit(this.generationId);

    // Reset downloading state
    setTimeout(() => {
      this.isDownloading = false;
    }, 2000);
  }
}