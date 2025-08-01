// File: frontend/src/app/services/cv-processing.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { AuthService } from './auth.service';
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
        private authService: AuthService
    ) { }

    async processCV(file: File, profilePicture?: string): Promise<CVProcessingResult> {
        try {
            // Reset phases
            this.resetPhases();

            // Phase 1: Upload file
            this.updatePhase(0, 'processing');
            await this.delay(300);
            const uploadResult = await this.uploadFile(file);
            this.updatePhase(0, 'completed');

            if (!uploadResult.success) {
                throw new Error(uploadResult.message || 'Upload failed');
            }

            // Phase 2: Start actual processing
            this.updatePhase(1, 'processing');
            await this.delay(500);
            this.updatePhase(1, 'completed');

            // Simulate individual processing phases
            const phaseNames = [
                'Processing personal information',
                'Generating about me content',
                'Extracting work experience',
                'Organizing skills and expertise',
                'Processing education background',
                'Finding projects and portfolio',
                'Extracting certifications'
            ];

            // Start actual backend processing (non-blocking)
            const processPromise = this.processCVFile(uploadResult.file.id);

            // Simulate phases with realistic timing
            for (let i = 2; i < this.phases.length; i++) {
                this.updatePhase(i, 'processing');
                await this.delay(800 + Math.random() * 400); // Random 800-1200ms
                this.updatePhase(i, 'completed');
            }

            // Wait for actual processing to complete
            const processResult = await processPromise;

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

            // Mark as completed
            this.progressSubject.next({
                currentPhase: this.phases.length,
                totalPhases: this.phases.length,
                phases: [...this.phases],
                completed: true
            });

            return {
                success: true,
                data: processResult.structuredData
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
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
                // Don't set Content-Type - let browser set it with boundary
            });

            this.http.post(`${this.apiUrl}/cv/upload`, formData, { headers }).subscribe({
                next: (response) => resolve(response),
                error: (error) => reject(new Error(error.error?.message || 'Upload failed'))
            });
        });
    }

    private processCVFile(fileId: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const headers = this.getAuthHeaders();

            this.http.post(`${this.apiUrl}/cv/process`, { fileId }, { headers }).subscribe({
                next: (response) => resolve(response),
                error: (error) => reject(new Error(error.error?.message || 'Processing failed'))
            });
        });
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