import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified?: boolean;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenKey = 'cv_generator_token';
  private userSubject = new BehaviorSubject<User | null>(null);
  
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkExistingLogin();
  }

  private checkExistingLogin() {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      this.getCurrentUser().subscribe({
        next: (response) => {
          if (response.success) {
            this.userSubject.next(response.user);
          } else {
            this.logout();
          }
        },
        error: () => {
          this.logout();
        }
      });
    }
  }

  login(credential: string): Observable<LoginResponse> {
    return new Observable(observer => {
      this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { credential }).subscribe({
        next: (response) => {
          if (response.success) {
            localStorage.setItem(this.tokenKey, response.token);
            this.userSubject.next(response.user);
          }
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  logout(): Observable<any> {
    return new Observable(observer => {
      const token = localStorage.getItem(this.tokenKey);
      const headers = token ? new HttpHeaders({
        'Authorization': `Bearer ${token}`
      }) : undefined;

      this.http.post(`${this.apiUrl}/auth/logout`, {}, { headers }).subscribe({
        next: (response) => {
          localStorage.removeItem(this.tokenKey);
          this.userSubject.next(null);
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          localStorage.removeItem(this.tokenKey);
          this.userSubject.next(null);
          observer.next(true);
          observer.complete();
        }
      });
    });
  }

  getCurrentUser(): Observable<any> {
    const token = localStorage.getItem(this.tokenKey);
    
    if (!token) {
      return new Observable(observer => {
        observer.next({ success: false, error: 'No token' });
        observer.complete();
      });
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.get(`${this.apiUrl}/auth/user`, { headers });
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.tokenKey) && !!this.userSubject.value;
  }

  getUser(): User | null {
    return this.userSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  refreshUserData(): Observable<any> {
    return new Observable(observer => {
      this.getCurrentUser().subscribe({
        next: (response) => {
          if (response.success) {
            this.userSubject.next(response.user);
            observer.next(response);
          } else {
            observer.error(response);
          }
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  getGoogleClientId(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/config`);
  }
}