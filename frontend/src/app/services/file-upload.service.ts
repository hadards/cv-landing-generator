import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEventType } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

export interface FileInfo {
    id: string;
    originalName: string;
    filename: string;
    path: string;
    size: number;
    mimetype: string;
    uploadedAt: string;
    userId: string;
    status: string;
}

export interface UploadResponse {
    success: boolean;
    message: string;
    file: FileInfo;
}

export interface ProcessResponse {
    success: boolean;
    message: string;
    extractedText: string;
    fileId: string;
    processedAt: string;
    structuredData: any;
}

export interface UploadProgress {
    percentage: number;
    status: 'uploading' | 'processing' | 'completed' | 'error';
    message: string;
    file?: FileInfo;
    extractedText?: string;
    structuredData?: any;
}


@Injectable({
    providedIn: 'root'
})
export class FileUploadService {
    private apiUrl = 'http://localhost:3000/api';
    private uploadProgressSubject = new BehaviorSubject<UploadProgress | null>(null);

    public uploadProgress$ = this.uploadProgressSubject.asObservable();

    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) { }

    private getAuthHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    uploadFile(file: File): Observable<UploadProgress> {
        return new Observable(observer => {
            // Validate file
            if (!this.validateFile(file)) {
                const error: UploadProgress = {
                    percentage: 0,
                    status: 'error',
                    message: 'Invalid file type. Please upload PDF, DOC, or DOCX files only.'
                };
                observer.next(error);
                observer.complete();
                return;
            }

            // Create form data
            const formData = new FormData();
            formData.append('cvFile', file);

            const headers = this.getAuthHeaders();
            // Remove Content-Type header to let browser set it with boundary
            headers.delete('Content-Type');

            // Upload file
            this.http.post<UploadResponse>(`${this.apiUrl}/cv/upload`, formData, {
                headers,
                reportProgress: true,
                observe: 'events'
            }).subscribe({
                next: (event) => {
                    if (event.type === HttpEventType.UploadProgress) {
                        const percentage = Math.round(100 * event.loaded / (event.total || 1));
                        const progress: UploadProgress = {
                            percentage,
                            status: 'uploading',
                            message: `Uploading... ${percentage}%`
                        };
                        this.uploadProgressSubject.next(progress);
                        observer.next(progress);
                    } else if (event.type === HttpEventType.Response) {
                        if (event.body?.success) {
                            // File uploaded, now process it
                            const uploadedProgress: UploadProgress = {
                                percentage: 100,
                                status: 'processing',
                                message: 'Processing CV...',
                                file: event.body.file
                            };
                            this.uploadProgressSubject.next(uploadedProgress);
                            observer.next(uploadedProgress);

                            // Process the file
                            this.processFile(event.body.file.id).subscribe({
                                next: (processResponse) => {
                                    const completedProgress: UploadProgress = {
                                        percentage: 100,
                                        status: 'completed',
                                        message: 'CV processed successfully!',
                                        file: event.body!.file,
                                        extractedText: processResponse.extractedText,
                                        structuredData: processResponse.structuredData // Add this line
                                    };
                                    this.uploadProgressSubject.next(completedProgress);
                                    observer.next(completedProgress);
                                    observer.complete();
                                },
                                error: (processError) => {
                                    const errorProgress: UploadProgress = {
                                        percentage: 100,
                                        status: 'error',
                                        message: 'Failed to process CV: ' + (processError.error?.message || processError.message)
                                    };
                                    this.uploadProgressSubject.next(errorProgress);
                                    observer.next(errorProgress);
                                    observer.complete();
                                }
                            });
                        } else {
                            const errorProgress: UploadProgress = {
                                percentage: 0,
                                status: 'error',
                                message: event.body?.message || 'Upload failed'
                            };
                            this.uploadProgressSubject.next(errorProgress);
                            observer.next(errorProgress);
                            observer.complete();
                        }
                    }
                },
                error: (error) => {
                    const errorProgress: UploadProgress = {
                        percentage: 0,
                        status: 'error',
                        message: 'Upload failed: ' + (error.error?.message || error.message)
                    };
                    this.uploadProgressSubject.next(errorProgress);
                    observer.next(errorProgress);
                    observer.complete();
                }
            });
        });
    }

    private processFile(fileId: string): Observable<ProcessResponse> {
        const headers = this.getAuthHeaders();
        return this.http.post<ProcessResponse>(`${this.apiUrl}/cv/process`, { fileId }, { headers });
    }

    private validateFile(file: File): boolean {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        const maxSize = 10 * 1024 * 1024; // 10MB

        return allowedTypes.includes(file.type) && file.size <= maxSize;
    }

    clearProgress() {
        this.uploadProgressSubject.next(null);
    }
}