// File: frontend/src/app/components/cv-wizard/cv-wizard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CVProcessingService, ProcessingProgress } from '../../services/cv-processing.service';
import { LandingPageService } from '../../services/landing-page.service';
import { Subscription } from 'rxjs';

interface WizardStep {
  id: number;
  title: string;
  completed: boolean;
  active: boolean;
}

interface CVSection {
  id: string;
  title: string;
  content: string;
  placeholder: string;
  rows: number;
}

@Component({
  selector: 'app-cv-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <!-- Wizard Header -->
      <div class="bg-gray-50 px-6 py-4 border-b">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-semibold text-gray-900">CV Landing Page Generator</h2>
          <div class="flex space-x-2">
            <div *ngFor="let step of wizardSteps" 
                 class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                 [class.bg-blue-600]="step.completed || step.active"
                 [class.text-white]="step.completed || step.active"
                 [class.bg-gray-200]="!step.completed && !step.active"
                 [class.text-gray-600]="!step.completed && !step.active">
              {{ step.id }}
            </div>
          </div>
        </div>
      </div>

      <!-- Wizard Content -->
      <div class="p-6 min-h-96">

        <!-- Step 1: Upload CV -->
        <div *ngIf="currentStep === 1" class="text-center">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Upload Your CV</h3>
          
          <div *ngIf="!uploadedFile" 
               class="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors"
               (dragover)="onDragOver($event)"
               (dragleave)="onDragLeave($event)" 
               (drop)="onDrop($event)">
            
            <div class="space-y-4">
              <div class="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
              </div>
              
              <div>
                <p class="text-gray-600">Drag and drop your CV here, or click to browse</p>
                <p class="text-sm text-gray-500 mt-1">Supports PDF, DOC, DOCX (max 10MB)</p>
              </div>
              
              <div>
                <input type="file" 
                       id="cv-file-input"
                       class="hidden"
                       accept=".pdf,.doc,.docx"
                       (change)="onFileSelected($event)">
                <label for="cv-file-input" class="btn-primary cursor-pointer inline-block">
                  Choose File
                </label>
              </div>
            </div>
          </div>

          <div *ngIf="uploadedFile" class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <div>
                  <p class="font-medium text-gray-900">{{ uploadedFile.name }}</p>
                  <p class="text-sm text-gray-600">{{ formatFileSize(uploadedFile.size) }}</p>
                </div>
              </div>
              <button (click)="removeFile()" class="text-red-600 hover:text-red-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Step 2: Upload Profile Picture -->
        <div *ngIf="currentStep === 2" class="text-center">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Add Profile Picture (Optional)</h3>
          
          <div *ngIf="!profilePicture" 
               class="border-2 border-dashed border-blue-300 rounded-lg p-6">
            <div class="space-y-4">
              <div class="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              
              <div>
                <p class="text-gray-600">Upload a professional headshot</p>
                <p class="text-sm text-gray-500 mt-1">JPG, PNG (max 5MB)</p>
              </div>
              
              <div class="space-x-3">
                <input type="file" 
                       id="profile-file-input"
                       class="hidden"
                       accept=".jpg,.jpeg,.png"
                       (change)="onProfileSelected($event)">
                <label for="profile-file-input" class="btn-primary cursor-pointer inline-block">
                  Choose Photo
                </label>
                <button (click)="skipProfilePicture()" class="btn-secondary">
                  Skip
                </button>
              </div>
            </div>
          </div>

          <div *ngIf="profilePicture" class="bg-white border border-gray-200 rounded-lg p-4 max-w-sm mx-auto">
            <div class="text-center space-y-4">
              <img [src]="profilePicture" alt="Profile Picture" 
                   class="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg">
              <p class="text-sm text-gray-600">Profile picture ready!</p>
              <button (click)="removeProfilePicture()" class="text-red-600 hover:text-red-700 text-sm">
                Remove Picture
              </button>
            </div>
          </div>
        </div>

        <!-- Step 3: Generate CV Data -->
        <div *ngIf="currentStep === 3" class="text-center">
          <h3 class="text-lg font-medium text-gray-900 mb-6">Generate CV Content</h3>
          
          <div *ngIf="!isProcessing && !cvData" class="space-y-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div class="flex items-center justify-center space-x-3 mb-4">
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a9 9 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                <span class="text-blue-800 font-medium">Ready to process your CV</span>
              </div>
              <p class="text-blue-700 text-sm mb-4">
                We'll extract your information and generate professional content for your landing page
              </p>
              <button (click)="startProcessing()" class="btn-primary text-lg px-8 py-3">
                Generate CV Content
              </button>
            </div>
          </div>

          <div *ngIf="isProcessing" class="space-y-4">
            <div class="bg-gray-50 rounded-lg p-6">
              <div class="flex items-center justify-center space-x-3 mb-4">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span class="font-medium text-gray-900">Processing CV...</span>
              </div>
              
              <div class="space-y-2">
                <div *ngFor="let phase of processingPhases" class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">{{ phase.name }}</span>
                  <span class="text-xs" 
                        [class.text-green-600]="phase.status === 'completed'"
                        [class.text-blue-600]="phase.status === 'processing'"
                        [class.text-gray-400]="phase.status === 'pending'">
                    {{ phase.status === 'completed' ? '✓' : phase.status === 'processing' ? '⟳' : '○' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="cvData && !isProcessing" class="text-left">
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div class="flex items-center space-x-2">
                <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span class="font-medium text-green-800">CV content generated successfully!</span>
              </div>
            </div>
            
            <p class="text-gray-600 text-center mb-6">Review and edit your content below:</p>
          </div>
        </div>

        <!-- Step 4: Edit Content -->
        <div *ngIf="currentStep === 4" class="space-y-6">
          <h3 class="text-lg font-medium text-gray-900 text-center mb-6">Review & Edit Content</h3>
          
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div class="flex items-center space-x-2 mb-2">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              <span class="font-medium text-blue-800">Edit Your Content</span>
            </div>
            <p class="text-blue-700 text-sm">
              Review and edit the generated content below. Your changes will be used in the final website.
            </p>
          </div>
          
          <div class="space-y-4">
            <div *ngFor="let section of cvSections" class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">{{ section.title }}</label>
              <textarea 
                [(ngModel)]="section.content"
                [placeholder]="section.placeholder"
                [rows]="section.rows"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 bg-white">
              </textarea>
              <!-- Show character count for user feedback -->
              <div class="text-xs text-gray-500 text-right">{{ section.content.length || 0 }} characters</div>
            </div>
          </div>
        </div>

        <!-- Step 5: Generate Website -->
        <div *ngIf="currentStep === 5" class="text-center">
          <h3 class="text-lg font-medium text-gray-900 mb-6">Generate Landing Page</h3>
          
          <div *ngIf="!isGeneratingWebsite && !websiteGenerated" class="space-y-4">
            <div class="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div class="flex items-center justify-center space-x-3 mb-4">
                <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"/>
                </svg>
                <span class="text-purple-800 font-medium">Ready to create your website</span>
              </div>
              <p class="text-purple-700 text-sm mb-4">
                We'll generate your professional landing page with your edited content
              </p>
              <button (click)="generateWebsite()" class="btn-primary text-lg px-8 py-3">
                Generate Website
              </button>
            </div>
          </div>

          <div *ngIf="isGeneratingWebsite" class="space-y-4">
            <div class="bg-gray-50 rounded-lg p-6">
              <div class="flex items-center justify-center space-x-3 mb-4">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                <span class="font-medium text-gray-900">Generating website...</span>
              </div>
              <p class="text-sm text-gray-600">This may take a few moments</p>
            </div>
          </div>

          <div *ngIf="websiteGenerated" class="space-y-4">
            <div class="bg-green-50 border border-green-200 rounded-lg p-6">
              <div class="flex items-center justify-center space-x-3 mb-4">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span class="text-green-800 font-medium text-lg">Website Generated!</span>
              </div>
              <p class="text-green-700 text-sm mb-4">
                Your professional landing page has been created with your edited content
              </p>
              <div class="space-x-3">
                <button class="btn-primary">Preview Website</button>
                <button class="btn-secondary">Download Files</button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Wizard Footer -->
      <div class="bg-gray-50 px-6 py-4 border-t flex justify-between">
        <button *ngIf="currentStep > 1 && currentStep < 5" 
                (click)="previousStep()" 
                class="btn-secondary">
          Back
        </button>
        <div *ngIf="currentStep === 1" class="w-20"></div>
        
        <button *ngIf="canProceed()" 
                (click)="nextStep()" 
                class="btn-primary">
          {{ getNextButtonText() }}
        </button>
        <div *ngIf="!canProceed() || currentStep === 5" class="w-20"></div>
      </div>
    </div>
  `
})
export class CVWizardComponent implements OnInit, OnDestroy {
  currentStep = 1;
  uploadedFile: File | null = null;
  profilePicture: string | null = null;
  isProcessing = false;
  cvData: any = null;
  isGeneratingWebsite = false;
  websiteGenerated = false;
  private progressSubscription?: Subscription;

  wizardSteps: WizardStep[] = [
    { id: 1, title: 'Upload CV', completed: false, active: true },
    { id: 2, title: 'Profile Picture', completed: false, active: false },
    { id: 3, title: 'Generate Content', completed: false, active: false },
    { id: 4, title: 'Edit Content', completed: false, active: false },
    { id: 5, title: 'Create Website', completed: false, active: false }
  ];

  processingPhases = [
    { name: 'Extracting personal information', status: 'pending' },
    { name: 'Generating about me content', status: 'pending' },
    { name: 'Processing work experience', status: 'pending' },
    { name: 'Organizing skills', status: 'pending' },
    { name: 'Processing education', status: 'pending' },
    { name: 'Extracting projects', status: 'pending' },
    { name: 'Finding certifications', status: 'pending' }
  ];

  cvSections: CVSection[] = [
    { id: 'summary', title: 'Professional Summary', content: '', placeholder: 'Enter your professional summary...', rows: 3 },
    { id: 'aboutMe', title: 'About Me', content: '', placeholder: 'Tell your professional story...', rows: 4 },
    { id: 'experience', title: 'Work Experience', content: '', placeholder: 'Your work experience will appear here...', rows: 8 },
    { id: 'skills', title: 'Skills', content: '', placeholder: 'Your skills will be listed here...', rows: 4 },
    { id: 'education', title: 'Education', content: '', placeholder: 'Your education background...', rows: 4 },
    { id: 'projects', title: 'Projects', content: '', placeholder: 'Your projects and portfolio...', rows: 6 },
    { id: 'certifications', title: 'Certifications', content: '', placeholder: 'Your certifications and credentials...', rows: 4 }
  ];

  constructor(
    private cvProcessingService: CVProcessingService,
    private landingPageService: LandingPageService
  ) {}

  ngOnInit() {
    // Subscribe to processing progress
    this.progressSubscription = this.cvProcessingService.progress$.subscribe(
      (progress: ProcessingProgress) => {
        this.processingPhases = progress.phases;
        
        if (progress.completed && !progress.error) {
          this.isProcessing = false;
          // Mark step 3 as completed and move to step 4
          this.wizardSteps[2].completed = true;
          this.nextStep();
        } else if (progress.error) {
          this.isProcessing = false;
          alert('Processing failed: ' + progress.error);
        }
      }
    );
  }

  ngOnDestroy() {
    this.progressSubscription?.unsubscribe();
  }

  // File upload methods
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
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
      const result = await this.cvProcessingService.processCV(this.uploadedFile, this.profilePicture || undefined);
      
      if (result.success) {
        this.cvData = result.data;
        this.populateCVSections();
        // nextStep() will be called by the progress subscription
      } else {
        this.isProcessing = false;
        alert('Failed to process CV: ' + result.message);
      }
      
    } catch (error) {
      this.isProcessing = false;
      alert('Failed to process CV: ' + (error as any).message);
    }
  }

  populateCVSections() {
    if (!this.cvData) return;
    
    // Convert CV data to editable sections
    const editableSections = this.cvProcessingService.convertToEditableSections(this.cvData);
    
    // Update our sections with the converted data
    editableSections.forEach(editableSection => {
      const section = this.cvSections.find(s => s.id === editableSection.id);
      if (section) {
        section.content = editableSection.content;
      }
    });

    console.log('CV sections populated for editing:', this.cvSections.map(s => ({ id: s.id, length: s.content?.length })));
  }

  async generateWebsite() {
    this.isGeneratingWebsite = true;
    
    try {
      // BUILD FINAL CV DATA FROM EDITED SECTIONS - This is the key fix!
      const finalData = this.buildFinalCVDataFromEditedSections();
      
      console.log('Generating website with edited content:', finalData);
      
      // Generate landing page with the edited content
      this.landingPageService.generateLandingPage(finalData).subscribe({
        next: (result) => {
          this.isGeneratingWebsite = false;
          if (result.success) {
            this.websiteGenerated = true;
            console.log('Website generated with user edits:', result);
          } else {
            throw new Error(result.message || 'Generation failed');
          }
        },
        error: (error) => {
          this.isGeneratingWebsite = false;
          alert('Failed to generate website: ' + (error.error?.message || error.message));
        }
      });
      
    } catch (error) {
      this.isGeneratingWebsite = false;
      alert('Failed to generate website: ' + (error as any).message);
    }
  }

  buildFinalCVDataFromEditedSections() {
    // CRITICAL: Use the edited content from the textboxes, not the original AI data
    console.log('Building final CV data from edited sections...');
    
    // Start with original structure
    const finalData = {
      ...this.cvData,
      personalInfo: {
        ...this.cvData.personalInfo
      }
    };

    // Update with edited content from textboxes
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
            // For experience, we need to be more careful since it's an array
            // For now, store as a combined text that the template can handle
            finalData.experienceText = section.content.trim();
            break;
          case 'skills':
            // For skills, store as combined text
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

    // Add profile picture if present
    if (this.profilePicture) {
      finalData.personalInfo.profilePicture = this.profilePicture;
    }

    // Mark that this data includes edited content
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
      case 1: return 'Next: Add Photo';
      case 2: return 'Next: Generate Content';
      case 3: return 'Review Content';
      case 4: return 'Create Website';
      default: return 'Next';
    }
  }

  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}