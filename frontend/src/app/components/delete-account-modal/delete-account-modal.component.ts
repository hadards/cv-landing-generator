import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-delete-account-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <!-- Header -->
        <div class="p-6 bg-gradient-to-br from-red-500 to-red-700">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-white text-center">Delete Account</h2>
        </div>

        <!-- Content -->
        <div class="p-6">
          <p class="text-gray-700 mb-4 font-semibold">
            This action cannot be undone. Your account and all data will be permanently deleted.
          </p>

          <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p class="text-sm font-semibold text-red-900 mb-2">What will be deleted:</p>
            <ul class="space-y-1 text-sm text-red-800">
              <li class="flex items-start">
                <span class="mr-2">•</span>
                <span>Your account and profile</span>
              </li>
              <li class="flex items-start">
                <span class="mr-2">•</span>
                <span>All uploaded CV files</span>
              </li>
              <li class="flex items-start">
                <span class="mr-2">•</span>
                <span>All generated landing pages</span>
              </li>
              <li class="flex items-start">
                <span class="mr-2">•</span>
                <span>Processing history</span>
              </li>
            </ul>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p class="text-xs text-blue-800">
              <strong>Note:</strong> Your published GitHub Pages will remain online.
            </p>
          </div>

          <!-- Loading State -->
          <div *ngIf="isDeleting" class="text-center py-4">
            <div class="inline-block w-6 h-6 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
            <p class="text-sm text-gray-600 mt-2">Deleting your account...</p>
          </div>

          <!-- Buttons -->
          <div *ngIf="!isDeleting" class="flex gap-3">
            <button (click)="cancel()"
                    class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors">
              Cancel
            </button>
            <button (click)="confirmDelete()"
                    class="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors">
              Delete My Account
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .animate-spin {
      animation: spin 1s linear infinite;
    }
  `]
})
export class DeleteAccountModalComponent {
  @Output() closeEvent = new EventEmitter<void>();

  isDeleting = false;

  constructor(
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  cancel() {
    this.closeEvent.emit();
  }

  confirmDelete() {
    this.isDeleting = true;

    this.authService.deleteAccount().subscribe({
      next: () => {
        this.isDeleting = false;
        this.toastService.success('Your account has been deleted');
        this.closeEvent.emit();
        // AuthService.deleteAccount() already handles logout and redirect
      },
      error: (error) => {
        this.isDeleting = false;
        console.error('Account deletion failed:', error);
        this.toastService.error('Failed to delete account: ' + (error.error?.message || error.message));
      }
    });
  }
}
