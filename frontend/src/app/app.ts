// File: frontend/src/app/app.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { TermsAcceptanceComponent } from './components/terms-acceptance/terms-acceptance.component';
import { LegalService } from './services/legal.service';
import { AuthService } from './services/auth.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent, TermsAcceptanceComponent],
  template: `
    <!-- Terms Acceptance Modal (shown if not accepted) -->
    <app-terms-acceptance
      *ngIf="showTermsModal"
      (accepted)="onTermsAccepted()">
    </app-terms-acceptance>

    <!-- Main Application -->
    <div class="min-h-screen bg-white flex flex-col" [class.blur-sm]="showTermsModal">
      <app-header></app-header>
      <main class="flex-1">
        <router-outlet></router-outlet>
      </main>
      <app-footer></app-footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
    
    .blur-sm {
      filter: blur(2px);
      pointer-events: none;
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'CVLanding - Professional Landing Page Generator';
  showTermsModal = false;

  constructor(
    private legalService: LegalService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Only check terms acceptance when user logs in for the first time
    this.authService.user$.subscribe(user => {
      if (user && !this.legalService.hasAcceptedTerms()) {
        // Show terms modal only on first login
        setTimeout(() => {
          this.showTermsModal = true;
        }, 500);
      }
    });
  }

  onTermsAccepted() {
    this.showTermsModal = false;
  }
}