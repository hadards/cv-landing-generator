import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let toast of toasts"
           class="toast toast-{{ toast.type }}"
           (click)="dismiss(toast.id)">
        <div class="toast-content">
          <div class="toast-icon">
            <span *ngIf="toast.type === 'success'">✓</span>
            <span *ngIf="toast.type === 'error'">✗</span>
            <span *ngIf="toast.type === 'warning'">!</span>
            <span *ngIf="toast.type === 'info'">i</span>
          </div>
          <div class="toast-message">{{ toast.message }}</div>
          <button class="toast-close" (click)="dismiss(toast.id); $event.stopPropagation()">×</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 80px;
      right: 1rem;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      pointer-events: none;
    }

    @media (max-width: 768px) {
      .toast-container {
        top: 70px;
        right: 1rem;
        left: 1rem;
        align-items: center;
      }
    }

    .toast {
      pointer-events: auto;
      min-width: 300px;
      max-width: 400px;
      padding: 1rem;
      border-radius: 0.75rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease-out;
      cursor: pointer;
      backdrop-filter: blur(10px);
      border: 1px solid;
    }

    @media (max-width: 768px) {
      .toast {
        width: 100%;
        max-width: none;
        min-width: auto;
      }
    }

    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast-success {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(22, 163, 74, 0.95));
      border-color: rgba(34, 197, 94, 0.5);
      color: white;
    }

    .toast-error {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95));
      border-color: rgba(239, 68, 68, 0.5);
      color: white;
    }

    .toast-warning {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.95), rgba(245, 158, 11, 0.95));
      border-color: rgba(251, 191, 36, 0.5);
      color: #0a0e27;
    }

    .toast-info {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.95));
      border-color: rgba(59, 130, 246, 0.5);
      color: white;
    }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .toast-icon {
      flex-shrink: 0;
      width: 1.5rem;
      height: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.125rem;
      font-weight: bold;
    }

    .toast-message {
      flex: 1;
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .toast-close {
      flex-shrink: 0;
      width: 1.5rem;
      height: 1.5rem;
      border: none;
      background: rgba(255, 255, 255, 0.2);
      color: inherit;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 1.25rem;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .toast-close:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .toast-warning .toast-close {
      background: rgba(0, 0, 0, 0.1);
    }

    .toast-warning .toast-close:hover {
      background: rgba(0, 0, 0, 0.2);
    }
  `]
})
export class ToastComponent implements OnInit {
  toasts: Toast[] = [];

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.toastService.toasts$.subscribe(toasts => {
      this.toasts = toasts;
    });
  }

  dismiss(id: string) {
    this.toastService.dismiss(id);
  }
}
