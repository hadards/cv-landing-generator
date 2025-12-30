// File: frontend/src/app/components/legal-viewer/legal-viewer.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegalService, LegalDocument } from '../../services/legal.service';

@Component({
  selector: 'app-legal-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black bg-opacity-50">
      <div class="relative w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col my-4 md:my-8">

        <!-- Header -->
        <div class="flex items-center justify-between p-3 md:p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">{{ document?.title || 'Legal Document' }}</h2>
            <p class="text-xs text-gray-600" *ngIf="document?.lastUpdated">
              Last updated: {{ document?.lastUpdated }}
            </p>
          </div>
          
          <!-- Experimental Warning Badge -->
          <div class="flex items-center space-x-3">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Experimental Service
            </span>
            <button
              (click)="close()"
              class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Content -->
        <div class="p-4 md:p-6 overflow-y-auto flex-1">
          
          <!-- Loading State -->
          <div *ngIf="isLoading" class="flex items-center justify-center py-12">
            <div class="text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p class="text-gray-600">Loading document...</p>
            </div>
          </div>
          
          <!-- Error State -->
          <div *ngIf="error" class="text-center py-12">
            <div class="text-red-600">
              <p class="font-medium">Failed to load document</p>
              <p class="text-sm mt-1">{{ error }}</p>
              <button 
                (click)="loadDocument()" 
                class="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                Try Again
              </button>
            </div>
          </div>
          
          <!-- Document Content -->
          <div *ngIf="!isLoading && !error && document" 
               class="prose prose-sm max-w-none"
               [innerHTML]="document.html">
          </div>
          
        </div>
        
        <!-- Footer -->
        <div class="px-4 py-3 md:px-6 md:py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 md:gap-0">
            <div class="text-xs text-gray-500 text-center md:text-left hidden md:block">
              This is an experimental service in development with limited guarantees.
            </div>
            <button
              (click)="close()"
              class="w-full md:w-auto px-4 py-3 md:py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
        
      </div>
    </div>
  `,
  styles: [`
    .prose {
      color: #374151;
      line-height: 1.6;
    }
    .prose h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 1rem;
      color: #111827;
    }
    .prose h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
      color: #111827;
    }
    .prose h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-top: 1.25rem;
      margin-bottom: 0.5rem;
      color: #111827;
    }
    .prose p {
      margin-bottom: 0.75rem;
    }
    .prose ul, .prose ol {
      margin-bottom: 0.75rem;
      padding-left: 1.5rem;
    }
    .prose li {
      margin-bottom: 0.25rem;
    }
    .prose strong {
      font-weight: 600;
    }
    .prose code {
      background-color: #f3f4f6;
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }
    .prose blockquote {
      border-left: 4px solid #e5e7eb;
      padding-left: 1rem;
      margin: 1rem 0;
      color: #6b7280;
    }
  `]
})
export class LegalViewerComponent implements OnInit {
  @Input() isOpen = false;
  @Input() documentType: 'terms' | 'privacy' | 'disclaimer' = 'terms';
  @Output() closeEvent = new EventEmitter<void>();

  document: LegalDocument | null = null;
  isLoading = false;
  error: string | null = null;

  constructor(private legalService: LegalService) {}

  ngOnInit() {
    if (this.isOpen) {
      this.loadDocument();
    }
  }

  ngOnChanges() {
    if (this.isOpen) {
      this.loadDocument();
    }
  }

  loadDocument() {
    if (!this.documentType) return;

    this.isLoading = true;
    this.error = null;

    const loadMethod = this.getLoadMethod();
    
    loadMethod.subscribe({
      next: (response) => {
        if (response.success && response.document) {
          this.document = response.document;
        } else {
          this.error = response.message || 'Failed to load document';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load document';
        this.isLoading = false;
      }
    });
  }

  private getLoadMethod() {
    switch (this.documentType) {
      case 'terms':
        return this.legalService.getTermsOfService();
      case 'privacy':
        return this.legalService.getPrivacyPolicy();
      case 'disclaimer':
        return this.legalService.getDisclaimer();
      default:
        return this.legalService.getTermsOfService();
    }
  }

  close() {
    this.closeEvent.emit();
  }
}