import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  private idCounter = 0;

  private show(type: Toast['type'], message: string, duration: number = 4000) {
    const id = `toast-${++this.idCounter}`;
    const toast: Toast = { id, type, message, duration };

    // On mobile, replace existing toast. On desktop, stack them.
    const isMobile = window.innerWidth < 768;
    const currentToasts = this.toastsSubject.value;

    if (isMobile) {
      // Replace all toasts with just this one
      this.toastsSubject.next([toast]);
    } else {
      // Add to stack (max 3 toasts)
      const updatedToasts = [...currentToasts, toast].slice(-3);
      this.toastsSubject.next(updatedToasts);
    }

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  success(message: string, duration?: number) {
    this.show('success', message, duration);
  }

  error(message: string, duration?: number) {
    this.show('error', message, duration);
  }

  warning(message: string, duration?: number) {
    this.show('warning', message, duration);
  }

  info(message: string, duration?: number) {
    this.show('info', message, duration);
  }

  dismiss(id: string) {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(t => t.id !== id));
  }

  clear() {
    this.toastsSubject.next([]);
  }
}
