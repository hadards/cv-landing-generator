// File: frontend/src/app/components/footer/footer.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LegalService } from '../../services/legal.service';
import { LegalViewerComponent } from '../legal-viewer/legal-viewer.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, LegalViewerComponent],
  template: `
    <footer class="bg-gray-50 border-t border-gray-200 mt-auto">
      <div class="container py-4">
        
        <!-- Experimental Service Warning -->
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div class="flex items-center justify-center space-x-2 text-yellow-800">
            <span class="text-sm font-medium">Experimental Educational Project</span>
          </div>
          <p class="text-xs text-yellow-700 text-center mt-1">
            Free tier service • Files auto-deleted in 12 hours • No warranties provided
          </p>
        </div>
        
        <!-- Main Footer Content -->
        <div class="flex flex-col md:flex-row items-center justify-between">
          <!-- Brand Section -->
          <div class="flex items-center space-x-4 mb-6 md:mb-0">
            <img src="assets/hadar-logo.png" alt="Hadar Logo" class="h-32" style="width: auto; min-width: 128px;">
            <div>
              <h3 class="text-lg font-bold text-gray-900">CV Landing Generator</h3>
              <p class="text-sm text-gray-600">Experimental • Educational • Free</p>
            </div>
          </div>
          
          <!-- Description -->
          <div class="text-center md:text-right max-w-md">
            <p class="text-gray-600 text-sm leading-relaxed">
              An experimental AI-powered service currently in development with limited guarantees.
            </p>
          </div>
        </div>

        <!-- Legal Links -->
        <div class="text-center my-4">
          <div class="flex flex-wrap justify-center items-center space-x-6 text-sm">
            <button
              (click)="openLegalDocument('terms')"
              class="text-gray-600 hover:text-gray-900 underline">
              Terms of Service
            </button>
            <button
              (click)="openLegalDocument('privacy')"
              class="text-gray-600 hover:text-gray-900 underline">
              Privacy Policy
            </button>
            <button
              (click)="openLegalDocument('disclaimer')"
              class="text-gray-600 hover:text-gray-900 underline">
              Service Disclaimer
            </button>
          </div>
        </div>

        <!-- Bottom Bar -->
        <div class="flex flex-col md:flex-row justify-between items-center pt-4 mt-4 border-t border-gray-300">
          <div class="text-sm text-gray-500 mb-2 md:mb-0">
            <p>© 2025 Experimental Educational Project</p>
            <p class="text-xs" *ngIf="hasAcceptedTerms">Terms accepted on {{ getAcceptanceDate() }}</p>
          </div>
          
          <div class="flex items-center space-x-4 text-xs text-gray-400">
            <span>Experimental</span>
            <span>•</span>
            <div class="flex items-center space-x-1">
              <div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>Free tier service</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
    
    <!-- Legal Document Viewer -->
    <app-legal-viewer
      [isOpen]="showLegalViewer"
      [documentType]="currentDocumentType"
      (closeEvent)="closeLegalViewer()">
    </app-legal-viewer>
  `,
  styles: [`
    button {
      cursor: pointer;
      transition: color 0.2s ease;
    }
  `]
})
export class FooterComponent implements OnInit {
  showLegalViewer = false;
  currentDocumentType: 'terms' | 'privacy' | 'disclaimer' = 'terms';
  hasAcceptedTerms = false;

  constructor(private legalService: LegalService) {}

  ngOnInit() {
    this.checkTermsAcceptance();
  }

  checkTermsAcceptance() {
    this.hasAcceptedTerms = this.legalService.hasAcceptedTerms();
  }

  openLegalDocument(type: 'terms' | 'privacy' | 'disclaimer') {
    this.currentDocumentType = type;
    this.showLegalViewer = true;
  }

  closeLegalViewer() {
    this.showLegalViewer = false;
  }

  getAcceptanceDate(): string {
    const details = this.legalService.getAcceptanceDetails();
    if (details && details.date) {
      return new Date(details.date).toLocaleDateString();
    }
    return 'Unknown';
  }
}