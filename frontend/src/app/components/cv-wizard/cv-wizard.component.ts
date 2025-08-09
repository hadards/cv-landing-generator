// File: frontend/src/app/components/cv-wizard/cv-wizard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CVProcessingService, ProcessingProgress } from '../../services/cv-processing.service';
import { LandingPageService } from '../../services/landing-page.service';
import { PreviewModalComponent } from '../preview-modal/preview-modal.component';
import { GitHubPublishButtonComponent, PublishSuccess } from '../github-publish-button/github-publish-button.component';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

interface WizardStep {
    id: number;
    title: string;
    description: string;
    completed: boolean;
    active: boolean;
    icon: string;
}

interface CVSection {
    id: string;
    title: string;
    content: string;
    placeholder: string;
    rows: number;
    icon: string;
}

@Component({
    selector: 'app-cv-wizard',
    standalone: true,
    imports: [CommonModule, FormsModule, PreviewModalComponent, GitHubPublishButtonComponent],
    templateUrl: 'cv-wizard.component.html',
    styleUrls: ['cv-wizard.component.scss']
})
export class CVWizardComponent implements OnInit, OnDestroy {
    currentStep = 1;
    uploadedFile: File | null = null;
    profilePicture: string | null = null;
    isProcessing = false;
    cvData: any = null;
    isGeneratingWebsite = false;
    websiteGenerated = false;
    isDragOver = false;
    private progressSubscription?: Subscription;

    showPreviewModal = false;
    generationId: string | null = null;
    isDownloading = false;
    generationResult: any = null;

    wizardSteps: WizardStep[] = [
        {
            id: 1,
            title: 'Upload CV',
            description: 'Select your CV file',
            completed: false,
            active: true,
            icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
        },
        {
            id: 2,
            title: 'Add Photo',
            description: 'Upload profile picture',
            completed: false,
            active: false,
            icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
        },
        {
            id: 3,
            title: 'AI Processing',
            description: 'Generate content',
            completed: false,
            active: false,
            icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a9 9 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
        },
        {
            id: 4,
            title: 'Edit Content',
            description: 'Review and customize',
            completed: false,
            active: false,
            icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2.5 2.5 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
        },
        {
            id: 5,
            title: 'Create Website',
            description: 'Generate landing page',
            completed: false,
            active: false,
            icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9'
        }
    ];

    processingPhases = [
        { name: 'Extracting personal information', status: 'pending' },
        { name: 'Generating professional summary', status: 'pending' },
        { name: 'Processing work experience', status: 'pending' },
        { name: 'Organizing skills and expertise', status: 'pending' },
        { name: 'Processing education background', status: 'pending' },
        { name: 'Extracting projects and achievements', status: 'pending' },
        { name: 'Finding certifications', status: 'pending' }
    ];

    cvSections: CVSection[] = [
        {
            id: 'summary',
            title: 'Professional Summary',
            content: '',
            placeholder: 'A compelling professional summary that highlights your key strengths and experience...',
            rows: 3,
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        },
        {
            id: 'aboutMe',
            title: 'About Me',
            content: '',
            placeholder: 'Tell your professional story in first person. What drives you? What makes you unique?',
            rows: 4,
            icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
        },
        {
            id: 'experience',
            title: 'Work Experience',
            content: '',
            placeholder: 'Your professional experience, achievements, and career highlights...',
            rows: 8,
            icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
        },
        {
            id: 'skills',
            title: 'Skills & Expertise',
            content: '',
            placeholder: 'Your technical skills, professional competencies, and areas of expertise...',
            rows: 4,
            icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a9 9 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
        },
        {
            id: 'education',
            title: 'Education',
            content: '',
            placeholder: 'Your educational background, degrees, and academic achievements...',
            rows: 4,
            icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
        },
        {
            id: 'projects',
            title: 'Projects',
            content: '',
            placeholder: 'Notable projects, portfolio work, and significant accomplishments...',
            rows: 6,
            icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
        },
        {
            id: 'certifications',
            title: 'Certifications',
            content: '',
            placeholder: 'Professional certifications, licenses, and credentials...',
            rows: 4,
            icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z'
        }
    ];

    constructor(
        private cvProcessingService: CVProcessingService,
        private landingPageService: LandingPageService
    ) { }

    ngOnInit() {
        // Progress subscription removed - now handled directly in job queue monitoring
    }


    ngOnDestroy() {
        this.progressSubscription?.unsubscribe();
    }

    // File handling methods
    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = true;
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = false;
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = false;

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            this.handleFileSelection(files[0]);
        }
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.handleFileSelection(input.files[0]);
        }
    }

    handleFileSelection(file: File) {
        if (this.validateFile(file)) {
            this.uploadedFile = file;
        }
    }

    validateFile(file: File): boolean {
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(file.type)) {
            alert('Please select a PDF, DOC, or DOCX file');
            return false;
        }

        if (file.size > maxSize) {
            alert('File size must be less than 10MB');
            return false;
        }

        return true;
    }

    removeFile() {
        this.uploadedFile = null;
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Profile picture methods
    onProfileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.compressAndConvertImage(input.files[0]);
        }
    }

    compressAndConvertImage(file: File) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            const maxSize = 300;
            let { width, height } = img;

            if (width > height) {
                if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);
            this.profilePicture = canvas.toDataURL('image/jpeg', 0.8);
        };

        img.src = URL.createObjectURL(file);
    }

    skipProfilePicture() {
        this.nextStep();
    }

    removeProfilePicture() {
        this.profilePicture = null;
    }

    // CV Processing methods
    async startProcessing() {
        if (!this.uploadedFile) return;

        this.isProcessing = true;

        try {
            // Use direct synchronous processing
            const result = await this.cvProcessingService.processCV(this.uploadedFile, this.profilePicture || undefined);

            this.isProcessing = false;

            if (result.success && result.data) {
                this.cvData = result.data;
                this.populateCVSections();
                this.wizardSteps[2].completed = true;
                this.nextStep();
                console.log('CV processing completed successfully');
            } else {
                alert('CV processing failed: ' + (result.message || 'Unknown error'));
            }

        } catch (error) {
            this.isProcessing = false;
            console.error('CV processing error:', error);
            const errorMessage = (error as any)?.message || 'Unknown error occurred';
            alert('Failed to process CV: ' + errorMessage);
        }
    }

    populateCVSections() {
        if (!this.cvData) return;

        const editableSections = this.cvProcessingService.convertToEditableSections(this.cvData);

        editableSections.forEach(editableSection => {
            const section = this.cvSections.find(s => s.id === editableSection.id);
            if (section) {
                section.content = editableSection.content;
            }
        });

        console.log('CV sections populated for editing:', this.cvSections.map(s => ({ id: s.id, length: s.content?.length })));
    }

    resetSection(section: CVSection) {
        // Reset to original AI-generated content
        if (this.cvData) {
            const originalSections = this.cvProcessingService.convertToEditableSections(this.cvData);
            const originalSection = originalSections.find(s => s.id === section.id);
            if (originalSection) {
                section.content = originalSection.content;
            }
        }
    }

    async generateWebsite() {
        this.isGeneratingWebsite = true;

        try {
            const finalData = this.buildFinalCVDataFromEditedSections();

            console.log('Generating website with edited content:', finalData);

            this.landingPageService.generateLandingPage(finalData).subscribe({
                next: (result) => {
                    this.isGeneratingWebsite = false;
                    if (result.success) {
                        this.websiteGenerated = true;
                        this.generationResult = result;
                        this.generationId = result.generation?.id || null;

                        console.log('Website generated successfully:', result);
                        console.log('Generation ID for preview:', this.generationId);
                    } else {
                        throw new Error(result.message || 'Generation failed');
                    }
                },
                error: (error) => {
                    this.isGeneratingWebsite = false;
                    console.error('Website generation failed:', error);
                    alert('Failed to generate website: ' + (error.error?.message || error.message));
                }
            });

        } catch (error) {
            this.isGeneratingWebsite = false;
            alert('Failed to generate website: ' + (error as any).message);
        }
    }

    // Open preview modal
    openPreview() {
        if (this.generationId) {
            console.log('Opening preview for generation ID:', this.generationId);
            this.showPreviewModal = true;
        } else {
            alert('No generation ID available for preview');
        }
    }

    // Close preview modal
    closePreview() {
        this.showPreviewModal = false;
    }

    async downloadWebsite() {
        if (!this.generationId || this.isDownloading) return;

        this.isDownloading = true;

        try {
            const downloadUrl = `${environment.apiUrl.replace('/api', '')}/api/cv/download?generationId=${this.generationId}`;

            // Create download link
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${this.cvData?.personalInfo?.name || 'landing-page'}-website.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('Download initiated for generation:', this.generationId);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Download failed. Please try again.');
        } finally {
            this.isDownloading = false;
        }
    }

    onDownloadFromPreview(generationId: string) {
        console.log('Download completed from preview:', generationId);
        // Optional: Show success message or update UI
    }

    buildFinalCVDataFromEditedSections() {
        console.log('Building final CV data from edited sections...');

        const finalData = {
            ...this.cvData,
            personalInfo: {
                ...this.cvData.personalInfo
            }
        };

        this.cvSections.forEach(section => {
            if (section.content && section.content.trim()) {
                switch (section.id) {
                    case 'summary':
                        finalData.personalInfo.summary = section.content.trim();
                        break;
                    case 'aboutMe':
                        finalData.personalInfo.aboutMe = section.content.trim();
                        break;
                    case 'experience':
                        finalData.experienceText = section.content.trim();
                        break;
                    case 'skills':
                        finalData.skillsText = section.content.trim();
                        break;
                    case 'education':
                        finalData.educationText = section.content.trim();
                        break;
                    case 'projects':
                        finalData.projectsText = section.content.trim();
                        break;
                    case 'certifications':
                        finalData.certificationsText = section.content.trim();
                        break;
                }
            }
        });

        if (this.profilePicture) {
            finalData.personalInfo.profilePicture = this.profilePicture;
        }

        finalData._hasEditedContent = true;

        console.log('Final data built with edited content:', {
            name: finalData.personalInfo.name,
            summaryLength: finalData.personalInfo.summary?.length,
            aboutMeLength: finalData.personalInfo.aboutMe?.length,
            hasExperienceText: !!finalData.experienceText,
            hasSkillsText: !!finalData.skillsText,
            hasEducationText: !!finalData.educationText,
            hasProjectsText: !!finalData.projectsText,
            hasCertificationsText: !!finalData.certificationsText
        });

        return finalData;
    }

    // Navigation methods
    canProceed(): boolean {
        switch (this.currentStep) {
            case 1: return !!this.uploadedFile;
            case 2: return true; // Profile picture is optional
            case 3: return !!this.cvData && !this.isProcessing;
            case 4: return true; // Can always proceed from editing
            case 5: return false; // No next step
            default: return false;
        }
    }

    nextStep() {
        if (this.canProceed() && this.currentStep < 5) {
            // Mark current step as completed and inactive
            this.wizardSteps[this.currentStep - 1].completed = true;
            this.wizardSteps[this.currentStep - 1].active = false;

            // Move to next step
            this.currentStep++;

            // Mark new step as active
            this.wizardSteps[this.currentStep - 1].active = true;
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            // Mark current step as inactive
            this.wizardSteps[this.currentStep - 1].active = false;

            // Move to previous step
            this.currentStep--;

            // Mark previous step as active and not completed
            this.wizardSteps[this.currentStep - 1].active = true;
            this.wizardSteps[this.currentStep - 1].completed = false;
        }
    }

    getNextButtonText(): string {
        switch (this.currentStep) {
            case 1: return 'Continue';
            case 2: return 'Process CV';
            case 3: return 'Review Content';
            case 4: return 'Create Website';
            default: return 'Next';
        }
    }

    delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // GitHub publish event handlers
    onPublished(result: PublishSuccess) {
        console.log('CV published successfully:', result);
        // The success message is now handled by the publish button component itself
    }

    onPublishError(error: string) {
        console.error('CV publish failed:', error);
        // The error message is now handled by the publish button component itself
    }
}