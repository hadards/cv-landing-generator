// File: frontend/src/app/components/terms-acceptance/terms-acceptance.component.ts
import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LegalService } from '../../services/legal.service';
import { LegalViewerComponent } from '../legal-viewer/legal-viewer.component';

@Component({
  selector: 'app-terms-acceptance',
  standalone: true,
  imports: [CommonModule, FormsModule, LegalViewerComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div class="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
        
        <!-- Header -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
            </div>
            <div>
              <h2 class="text-xl font-bold text-gray-900">Experimental Service Agreement</h2>
              <p class="text-sm text-gray-600">Required before using CV Landing Generator</p>
            </div>
          </div>
          
          <!-- Experimental Warning -->
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <span class="text-yellow-600 text-lg font-bold">!</span>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-yellow-800">Important Notice</h3>
                <div class="mt-1 text-xs text-yellow-700">
                  <p>This is an <strong>experimental service in development</strong> running on free tier infrastructure.</p>
                  <p class="mt-1"><strong>Your files are automatically deleted within 12 hours.</strong></p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div class="p-6">
          
          <!-- Key Points -->
          <div class="space-y-4 mb-6">
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                <span class="text-red-600 text-xs font-bold">1</span>
              </div>
              <div>
                <h4 class="text-sm font-medium text-gray-900">Experimental Service</h4>
                <p class="text-xs text-gray-600">No warranties, guarantees, or commercial support provided.</p>
              </div>
            </div>
            
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                <span class="text-red-600 text-xs font-bold">2</span>
              </div>
              <div>
                <h4 class="text-sm font-medium text-gray-900">Temporary File Storage</h4>
                <p class="text-xs text-gray-600">All uploaded files and generated content automatically deleted within 12 hours.</p>
              </div>
            </div>
            
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                <span class="text-red-600 text-xs font-bold">3</span>
              </div>
              <div>
                <h4 class="text-sm font-medium text-gray-900">Free Tier Limitations</h4>
                <p class="text-xs text-gray-600">Service may be unavailable, slow, or limited due to free hosting constraints.</p>
              </div>
            </div>
            
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                <span class="text-red-600 text-xs font-bold">4</span>
              </div>
              <div>
                <h4 class="text-sm font-medium text-gray-900">No Data Backup</h4>
                <p class="text-xs text-gray-600">We cannot recover deleted files or regenerate lost content.</p>
              </div>
            </div>
          </div>
          
          <!-- Legal Documents Links -->
          <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 class="text-sm font-medium text-gray-900 mb-2">Legal Documents</h4>
            <div class="space-x-4 text-xs">
              <button
                (click)="openLegalViewer('terms')"
                class="text-blue-600 hover:text-blue-800 underline">
                Terms of Service
              </button>
              <button
                (click)="openLegalViewer('privacy')"
                class="text-blue-600 hover:text-blue-800 underline">
                Privacy Policy
              </button>
              <button
                (click)="openLegalViewer('disclaimer')"
                class="text-blue-600 hover:text-blue-800 underline">
                Service Disclaimer
              </button>
            </div>
          </div>
          
          <!-- Acceptance Checkbox -->
          <div class="mb-6">
            <label class="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                [(ngModel)]="hasAccepted"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mt-0.5">
              <div class="text-sm text-gray-700">
                <span>I acknowledge that I have read and agree to the </span>
                <button
                  type="button"
                  (click)="openLegalViewer('terms')"
                  class="text-blue-600 hover:text-blue-800 underline">Terms of Service</button>,
                <button
                  type="button"
                  (click)="openLegalViewer('privacy')"
                  class="text-blue-600 hover:text-blue-800 underline">Privacy Policy</button>, and
                <button
                  type="button"
                  (click)="openLegalViewer('disclaimer')"
                  class="text-blue-600 hover:text-blue-800 underline">Service Disclaimer</button>.
                <div class="mt-1 text-xs text-gray-600">
                  I understand this is an experimental service with automatic file deletion and no data recovery.
                </div>
              </div>
            </label>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div class="flex items-center justify-between">
            <div class="text-xs text-gray-500">
              Agreement required to continue using this experimental service.
            </div>
            <button
              (click)="acceptTerms()"
              [disabled]="!hasAccepted"
              class="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {{ hasAccepted ? 'Accept & Continue' : 'Please Accept Terms' }}
            </button>
          </div>
        </div>
        
      </div>
    </div>
    
    <!-- Legal Document Viewer -->
    <app-legal-viewer
      [isOpen]="showLegalViewer"
      [documentType]="currentDocumentType"
      (closeEvent)="closeLegalViewer()">
    </app-legal-viewer>
  `,
  styles: [`
    .cursor-pointer {
      cursor: pointer;
    }
  `]
})
export class TermsAcceptanceComponent implements OnInit {
  @Output() accepted = new EventEmitter<void>();

  hasAccepted = false;
  showLegalViewer = false;
  currentDocumentType: 'terms' | 'privacy' | 'disclaimer' = 'terms';

  constructor(private legalService: LegalService) {}

  ngOnInit() {
    // Check if terms were already accepted
    if (this.legalService.hasAcceptedTerms()) {
      // Auto-accept if already accepted recently
      setTimeout(() => this.accepted.emit(), 100);
    }
  }

  openLegalViewer(type: 'terms' | 'privacy' | 'disclaimer') {
    this.currentDocumentType = type;
    this.showLegalViewer = true;
  }

  closeLegalViewer() {
    this.showLegalViewer = false;
  }

  acceptTerms() {
    if (!this.hasAccepted) {
      return;
    }

    // Save acceptance
    this.legalService.acceptTerms();
    
    // Emit acceptance event
    this.accepted.emit();
  }
}