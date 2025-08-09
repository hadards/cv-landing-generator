// File: frontend/src/app/services/cv-processing.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { QueueService, QueueJob } from './queue.service';
import { environment } from '../../environments/environment';

export interface ProcessingPhase {
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface CVProcessingResult {
    success: boolean;
    data: any;
    message?: string;
}

export interface ProcessingProgress {
    currentPhase: number;
    totalPhases: number;
    phases: ProcessingPhase[];
    completed: boolean;
    error?: string;
}

@Injectable({
    providedIn: 'root'
})
export class CVProcessingService {
    private apiUrl = environment.apiUrl;
    private progressSubject = new Subject<ProcessingProgress>();
    private lastProcessedData: any = null;

    public progress$ = this.progressSubject.asObservable();

    private phases: ProcessingPhase[] = [
        { name: 'Uploading CV file', status: 'pending' },
        { name: 'Extracting text content', status: 'pending' },
        { name: 'Processing personal information', status: 'pending' },
        { name: 'Generating about me content', status: 'pending' },
        { name: 'Extracting work experience', status: 'pending' },
        { name: 'Organizing skills and expertise', status: 'pending' },
        { name: 'Processing education background', status: 'pending' },
        { name: 'Finding projects and portfolio', status: 'pending' },
        { name: 'Extracting certifications', status: 'pending' }
    ];

    constructor(
        private http: HttpClient,
        private authService: AuthService,
        private queueService: QueueService
    ) { }

    /**
     * Process CV using queue system
     */
    async processCVWithQueue(file: File, profilePicture?: string): Promise<{jobId: string, fileId: string, job: Observable<QueueJob>}> {
        try {
            // Reset phases
            this.resetPhases();
            
            // Pre-check: Verify authentication
            const token = this.authService.getToken();
            if (!token) {
                throw new Error('Authentication required - please log in first');
            }
            
            console.log('Starting CV processing with queue:', {
                fileName: file.name,
                fileSize: file.size,
                hasAuth: !!token
            });
            
            // Phase 1: File Upload
            this.updatePhase(0, 'processing');
            const uploadResult = await this.uploadFile(file);
            this.updatePhase(0, 'completed');
            
            // Validate upload result has fileId
            if (!uploadResult.success || !uploadResult.file?.id) {
                throw new Error('Upload failed - no file ID received');
            }
            
            // Phase 2: Queue CV Processing
            this.updatePhase(1, 'processing');
            const processResult = await this.queueCVProcessing(uploadResult.file.id);
            this.updatePhase(1, 'completed');
            
            // Start polling job status
            const jobObservable = this.queueService.pollJobStatus(processResult.jobId);
            
            return {
                jobId: processResult.jobId,
                fileId: uploadResult.file.id,
                job: jobObservable
            };
            
        } catch (error) {
            this.updatePhase(this.getCurrentPhaseIndex(), 'error');
            throw error;
        }
    }

    /**
     * Process CV directly and simply (fallback)
     */
    async processCV(file: File, profilePicture?: string): Promise<CVProcessingResult> {
        try {
            // Reset phases
            this.resetPhases();

            // Phase 1: Upload file
            this.updatePhase(0, 'processing');
            const uploadResult = await this.uploadFile(file);
            this.updatePhase(0, 'completed');

            if (!uploadResult.success) {
                throw new Error(uploadResult.message || 'Upload failed');
            }

            // Phase 2: Start processing - show phases for UX
            for (let i = 1; i < this.phases.length; i++) {
                this.updatePhase(i, 'processing');
                
                if (i === 1) {
                    // Actual processing happens here
                    const processResult = await this.processCVFile(uploadResult.file.id);
                    
                    if (!processResult.success) {
                        throw new Error(processResult.message || 'Processing failed');
                    }

                    // Add profile picture if provided
                    if (profilePicture && processResult.structuredData) {
                        processResult.structuredData.personalInfo = {
                            ...processResult.structuredData.personalInfo,
                            profilePicture: profilePicture
                        };
                    }
                    
                    // Store result for return
                    this.lastProcessedData = processResult.structuredData;
                } else {
                    // Quick delay for UX
                    await this.delay(200);
                }
                
                this.updatePhase(i, 'completed');
            }

            // Mark as completed
            this.progressSubject.next({
                currentPhase: this.phases.length,
                totalPhases: this.phases.length,
                phases: [...this.phases],
                completed: true
            });

            return {
                success: true,
                data: this.lastProcessedData
            };

        } catch (error) {
            const currentPhase = this.phases.findIndex(p => p.status === 'processing');
            if (currentPhase >= 0) {
                this.phases[currentPhase].status = 'error';
            }

            this.progressSubject.next({
                currentPhase: currentPhase,
                totalPhases: this.phases.length,
                phases: [...this.phases],
                completed: false,
                error: (error as Error).message
            });

            return {
                success: false,
                data: null,
                message: (error as Error).message
            };
        }
    }


    private resetPhases() {
        this.phases.forEach(phase => phase.status = 'pending');
        this.progressSubject.next({
            currentPhase: 0,
            totalPhases: this.phases.length,
            phases: [...this.phases],
            completed: false
        });
    }

    private updatePhase(index: number, status: ProcessingPhase['status']) {
        if (index >= 0 && index < this.phases.length) {
            this.phases[index].status = status;
            this.progressSubject.next({
                currentPhase: index,
                totalPhases: this.phases.length,
                phases: [...this.phases],
                completed: false
            });
        }
    }

    private uploadFile(file: File): Promise<any> {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('cvFile', file);

            // Get auth headers but don't set Content-Type for file uploads
            const token = this.authService.getToken();
            
            if (!token) {
                reject(new Error('Authentication required - please log in'));
                return;
            }
            
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
                // Don't set Content-Type - let browser set it with boundary
            });

            console.log('Uploading file:', {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                hasToken: !!token
            });

            this.http.post(`${this.apiUrl}/cv/upload`, formData, { headers }).subscribe({
                next: (response: any) => {
                    console.log('Upload successful:', {
                        success: response.success,
                        fileId: response.file?.id,
                        fileName: response.file?.originalName
                    });
                    resolve(response);
                },
                error: (error) => {
                    console.error('Upload error:', error);
                    console.error('Upload error details:', {
                        status: error.status,
                        statusText: error.statusText,
                        url: error.url,
                        error: error.error
                    });
                    
                    let errorMessage = 'Upload failed';
                    if (error.status === 401) {
                        errorMessage = 'Authentication failed - please log in again';
                    } else if (error.status === 400) {
                        errorMessage = error?.error?.error || 'Invalid file or upload failed';
                    } else {
                        errorMessage = error?.error?.message || error?.message || 'Upload failed';
                    }
                    
                    reject(new Error(errorMessage));
                }
            });
        });
    }

    private processCVFile(fileId: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const headers = this.getAuthHeaders();

            this.http.post(`${this.apiUrl}/cv/process`, { fileId }, { headers }).subscribe({
                next: (response) => resolve(response),
                error: (error) => {
                    // Handle rate limiting with retry suggestion
                    if (error.status === 429) {
                        reject(new Error('System is busy processing other CVs. Please try again in a moment.'));
                    } else {
                        reject(new Error(error.error?.message || 'Processing failed'));
                    }
                }
            });
        });
    }

    /**
     * Queue CV processing job
     */
    private async queueCVProcessing(fileId: string): Promise<{jobId: string, position: number, estimatedWaitMinutes: number}> {
        return new Promise((resolve, reject) => {
            const token = this.authService.getToken();
            
            if (!token) {
                reject(new Error('Authentication required - please log in'));
                return;
            }
            
            console.log('Queueing CV processing:', {
                fileId,
                hasToken: !!token,
                apiUrl: `${this.apiUrl}/cv/process`
            });
            
            this.http.post<any>(`${this.apiUrl}/cv/process`, 
                { fileId },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            ).subscribe({
                next: (response) => {
                    if (response.success) {
                        resolve({
                            jobId: response.jobId,
                            position: response.position,
                            estimatedWaitMinutes: response.estimatedWaitMinutes
                        });
                    } else {
                        reject(new Error(response.message || 'Failed to queue CV processing'));
                    }
                },
                error: (error) => {
                    console.error('Queue processing error:', error);
                    console.error('Error details:', {
                        status: error.status,
                        statusText: error.statusText,
                        url: error.url,
                        error: error.error
                    });
                    
                    let errorMessage = 'Processing queue failed';
                    if (error.status === 400) {
                        errorMessage = error?.error?.error || 'Bad request - validation failed';
                        if (error?.error?.details) {
                            errorMessage += ': ' + error.error.details.map((d: any) => d.msg).join(', ');
                        }
                    } else if (error.status === 401) {
                        errorMessage = 'Authentication failed - please log in again';
                    } else if (error.status === 403) {
                        errorMessage = 'Access denied - file not authorized';
                    } else if (error.status === 404) {
                        errorMessage = 'File not found - please upload again';
                    } else {
                        errorMessage = error?.error?.message || error?.message || 'Processing queue failed';
                    }
                    
                    reject(new Error(errorMessage));
                }
            });
        });
    }

    /**
     * Get current phase index for error handling
     */
    private getCurrentPhaseIndex(): number {
        return this.phases.findIndex(phase => phase.status === 'processing');
    }

    private getAuthHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Updated method to convert CV data to editable sections
    convertToEditableSections(cvData: any): { id: string, title: string, content: string }[] {
        const sections = [];

        // Summary section
        if (cvData.personalInfo?.summary) {
            sections.push({
                id: 'summary',
                title: 'Professional Summary',
                content: cvData.personalInfo.summary
            });
        }

        // About Me section  
        if (cvData.personalInfo?.aboutMe) {
            sections.push({
                id: 'aboutMe',
                title: 'About Me',
                content: cvData.personalInfo.aboutMe
            });
        }

        // Experience section - convert array to editable text
        if (cvData.experience?.length > 0) {
            const experienceText = this.convertExperienceToText(cvData.experience);
            sections.push({
                id: 'experience',
                title: 'Work Experience',
                content: experienceText
            });
        }

        // Skills section - convert object to editable text
        if (cvData.skills) {
            const skillsText = this.convertSkillsToText(cvData.skills);
            sections.push({
                id: 'skills',
                title: 'Skills & Expertise',
                content: skillsText
            });
        }

        // Education section - convert array to editable text
        if (cvData.education?.length > 0) {
            const educationText = this.convertEducationToText(cvData.education);
            sections.push({
                id: 'education',
                title: 'Education',
                content: educationText
            });
        }

        // Projects section - convert array to editable text
        if (cvData.projects?.length > 0) {
            const projectsText = this.convertProjectsToText(cvData.projects);
            sections.push({
                id: 'projects',
                title: 'Projects',
                content: projectsText
            });
        }

        // Certifications section - convert array to editable text
        if (cvData.certifications?.length > 0) {
            const certificationsText = this.convertCertificationsToText(cvData.certifications);
            sections.push({
                id: 'certifications',
                title: 'Certifications',
                content: certificationsText
            });
        }

        console.log('Converted CV data to editable sections:', sections.map(s => ({ id: s.id, contentLength: s.content.length })));
        return sections;
    }

    // Helper methods to convert structured data to editable text
    private convertExperienceToText(experience: any[]): string {
        return experience.map(exp => {
            let text = `${exp.title} at ${exp.company}`;
            if (exp.location) text += ` (${exp.location})`;
            text += `\n${exp.startDate} - ${exp.endDate}\n`;
            text += `${exp.description}\n`;
            
            if (exp.achievements && exp.achievements.length > 0) {
                text += '\nKey Achievements:\n';
                exp.achievements.forEach((achievement: string) => {
                    text += `• ${achievement}\n`;
                });
            }
            
            return text;
        }).join('\n\n');
    }

    private convertSkillsToText(skills: any): string {
        let text = '';
        
        if (skills.technical && skills.technical.length > 0) {
            text += `Technical Skills:\n${skills.technical.join(', ')}\n\n`;
        }
        
        if (skills.soft && skills.soft.length > 0) {
            text += `Professional Skills:\n${skills.soft.join(', ')}\n\n`;
        }
        
        if (skills.languages && skills.languages.length > 0) {
            text += `Languages:\n${skills.languages.join(', ')}\n\n`;
        }
        
        return text.trim();
    }

    private convertEducationToText(education: any[]): string {
        return education.map(edu => {
            let text = `${edu.degree} from ${edu.institution}`;
            if (edu.location) text += ` (${edu.location})`;
            if (edu.graduationDate) text += `\nGraduated: ${edu.graduationDate}`;
            if (edu.gpa) text += `\nGPA: ${edu.gpa}`;
            
            if (edu.achievements && edu.achievements.length > 0) {
                text += '\nAchievements:\n';
                edu.achievements.forEach((achievement: string) => {
                    text += `• ${achievement}\n`;
                });
            }
            
            return text;
        }).join('\n\n');
    }

    private convertProjectsToText(projects: any[]): string {
        return projects.map(proj => {
            let text = `${proj.name}\n${proj.description}`;
            
            if (proj.technologies && proj.technologies.length > 0) {
                text += `\nTechnologies: ${proj.technologies.join(', ')}`;
            }
            
            if (proj.url) {
                text += `\nURL: ${proj.url}`;
            }
            
            return text;
        }).join('\n\n');
    }

    private convertCertificationsToText(certifications: any[]): string {
        return certifications.map(cert => {
            let text = `${cert.name} - ${cert.issuer}`;
            if (cert.date) text += ` (${cert.date})`;
            if (cert.url) text += `\nID/URL: ${cert.url}`;
            if (cert.description) text += `\n${cert.description}`;
            
            return text;
        }).join('\n\n');
    }
}