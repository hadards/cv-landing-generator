import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, switchMap, takeWhile, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface QueueJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  position: number;
  estimatedWaitMinutes: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  structuredData?: any;
  error?: string;
}

export interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  avg_processing_time: number;
}

@Injectable({
  providedIn: 'root'
})
export class QueueService {
  private apiUrl = environment.apiUrl;
  private pollingJobs = new Map<string, BehaviorSubject<QueueJob>>();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Get job status by ID
   */
  getJobStatus(jobId: string): Observable<QueueJob> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<{success: boolean, job: QueueJob}>(`${this.apiUrl}/cv/job/${jobId}/status`, { headers })
      .pipe(
        map(response => response.job),
        catchError(error => {
          console.error('Failed to get job status:', error);
          throw error;
        })
      );
  }

  /**
   * Start polling job status with automatic updates
   */
  pollJobStatus(jobId: string, intervalMs: number = 3000): Observable<QueueJob> {
    // Return existing subject if already polling
    if (this.pollingJobs.has(jobId)) {
      return this.pollingJobs.get(jobId)!.asObservable();
    }

    // Create new subject for this job
    const jobSubject = new BehaviorSubject<QueueJob>({} as QueueJob);
    this.pollingJobs.set(jobId, jobSubject);

    // Start polling
    const polling$ = interval(intervalMs).pipe(
      switchMap(() => this.getJobStatus(jobId)),
      takeWhile(job => {
        // Continue polling while job is queued or processing
        const shouldContinue = job.status === 'queued' || job.status === 'processing';
        
        // Update the subject
        jobSubject.next(job);
        
        // Stop polling if job is complete/failed
        if (!shouldContinue) {
          setTimeout(() => {
            this.stopPolling(jobId);
          }, 5000); // Keep final status for 5 seconds
        }
        
        return shouldContinue;
      }, true) // Include final emission
    );

    // Subscribe to polling
    polling$.subscribe({
      next: (job) => jobSubject.next(job),
      error: (error) => {
        console.error(`Polling error for job ${jobId}:`, error);
        jobSubject.error(error);
        this.stopPolling(jobId);
      }
    });

    return jobSubject.asObservable();
  }

  /**
   * Stop polling for a specific job
   */
  stopPolling(jobId: string): void {
    const subject = this.pollingJobs.get(jobId);
    if (subject) {
      subject.complete();
      this.pollingJobs.delete(jobId);
    }
  }

  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    for (const [jobId, subject] of this.pollingJobs) {
      subject.complete();
    }
    this.pollingJobs.clear();
  }

  /**
   * Get all jobs for current user
   */
  getUserJobs(): Observable<{jobs: QueueJob[], queueStats: QueueStats}> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<{success: boolean, jobs: QueueJob[], queueStats: QueueStats}>(`${this.apiUrl}/cv/jobs`, { headers })
      .pipe(map(response => ({
        jobs: response.jobs,
        queueStats: response.queueStats
      })));
  }

  /**
   * Cancel a queued job
   */
  cancelJob(jobId: string): Observable<{success: boolean, message: string}> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.delete<{success: boolean, message: string}>(`${this.apiUrl}/cv/job/${jobId}`, { headers });
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): Observable<QueueStats> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<{success: boolean, stats: QueueStats}>(`${this.apiUrl}/cv/queue/stats`, { headers })
      .pipe(map(response => response.stats));
  }

  /**
   * Format estimated wait time
   */
  formatWaitTime(minutes: number): string {
    if (minutes === 0) return 'Processing now';
    if (minutes < 1) return 'Less than a minute';
    if (minutes === 1) return '1 minute';
    return `${Math.round(minutes)} minutes`;
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: QueueJob['status']): string {
    switch (status) {
      case 'queued': return 'text-yellow-600';
      case 'processing': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  /**
   * Get status icon for UI
   */
  getStatusIcon(status: QueueJob['status']): string {
    switch (status) {
      case 'queued': return '';
      case 'processing': return '';
      case 'completed': return '';
      case 'failed': return '';
      default: return '';
    }
  }

  /**
   * Get user-friendly status message
   */
  getStatusMessage(job: QueueJob): string {
    switch (job.status) {
      case 'queued':
        return `#${job.position} in line - ${this.formatWaitTime(job.estimatedWaitMinutes)} wait`;
      case 'processing':
        return 'Processing your CV now...';
      case 'completed':
        return 'Your CV is ready!';
      case 'failed':
        return `Processing failed: ${job.error || 'Unknown error'}`;
      default:
        return 'Unknown status';
    }
  }
}