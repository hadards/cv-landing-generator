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
  imports: [CommonModule, FormsModule],
  template: `
   <div class="container max-w-5xl mx-auto section-padding cv-wizard">
      <!-- Wizard Header -->
      <div class="text-center mb-12 fade-in">
        <div class="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-sm border border-warm-coral mb-6">
          <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          <span class="text-sm font-medium warm-text-primary">AI-Powered • Fast • Professional</span>
        </div>
        
        <h1 class="text-4xl md:text-5xl font-bold mb-6">
          <span class="warm-text-primary">Transform Your</span>
          <br>
          <span class="text-gradient">CV into a Stunning</span>
          <br>
          <span class="warm-text-primary">Landing Page</span>
        </h1>
        
        <p class="text-xl warm-text-secondary max-w-2xl mx-auto leading-relaxed">
          Upload your CV and let our AI create a beautiful, responsive landing page that showcases your professional story in minutes.
        </p>
      </div>

      <!-- Progress Steps -->
      <div class="mb-12 slide-up">
        <div class="wizard-steps">
          <div class="flex items-center justify-between max-w-4xl mx-auto">
            <div *ngFor="let step of wizardSteps; let i = index" 
                 class="flex items-center"
                 [class.flex-1]="i < wizardSteps.length - 1">
              
              <!-- Step Circle -->
              <div class="step-indicator"
                   [class.completed]="step.completed"
                   [class.active]="step.active"
                   [class.pending]="!step.completed && !step.active">
                <svg *ngIf="step.completed" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span *ngIf="!step.completed">{{ step.id }}</span>
              </div>
              
              <!-- Step Info -->
              <div class="ml-4 hidden md:block step-text">
                <p class="font-medium text-sm mb-1"
                   [class.warm-text-primary]="step.completed || step.active"
                   [class.warm-text-light]="!step.completed && !step.active">
                  {{ step.title }}
                </p>
                <p class="text-xs warm-text-light">{{ step.description }}</p>
              </div>
              
              <!-- Connector Line -->
              <div *ngIf="i < wizardSteps.length - 1" 
                   class="flex-1 h-1 mx-6 step-line"
                   [class.completed]="step.completed">
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step Content -->
      <div class="card max-w-4xl mx-auto scale-in">
        
        <!-- Step 1: Upload CV -->
        <div *ngIf="currentStep === 1" class="text-center">
          <div class="w-16 h-16 bg-gradient rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span class="text-warm-orange font-bold text-xs">CV</span>
            </div>
          </div>
          
          <h2 class="text-2xl font-bold warm-text-primary mb-4">Upload Your CV</h2>
          <p class="warm-text-secondary mb-8 max-w-md mx-auto">
            Upload your CV in PDF, DOC, or DOCX format and we'll extract your information automatically
          </p>
          
          <div *ngIf="!uploadedFile" 
               class="upload-zone"
               (dragover)="onDragOver($event)"
               (dragleave)="onDragLeave($event)" 
               (drop)="onDrop($event)"
               [class.dragover]="isDragOver">
            
            <div class="space-y-6 relative z-10">
              <div class="w-20 h-20 bg-warm-cream rounded-xl flex items-center justify-center mx-auto">
                <div class="w-10 h-10 bg-warm-orange rounded-lg flex items-center justify-center">
                  <span class="text-white font-bold">CV</span>
                </div>
              </div>
              
              <div>
                <p class="text-lg font-medium warm-text-primary mb-2">
                  Drag and drop your CV here
                </p>
                <p class="warm-text-secondary mb-4">
                  or click to browse your files
                </p>
                <p class="text-sm warm-text-light">
                  Supports PDF, DOC, DOCX • Max size 10MB
                </p>
              </div>
              
              <div>
                <input type="file" 
                       id="cv-file-input"
                       class="hidden"
                       accept=".pdf,.doc,.docx"
                       (change)="onFileSelected($event)">
                <label for="cv-file-input" class="btn-primary cursor-pointer inline-flex items-center">
                  <span class="mr-2">+</span>
                  Choose File
                </label>
              </div>
            </div>
          </div>

          <div *ngIf="uploadedFile" class="file-upload-card max-w-md mx-auto p-6">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center border-2 border-green-300">
                <span class="text-green-600 font-bold text-lg">✓</span>
              </div>
              <div class="flex-1 text-left">
                <p class="file-name font-semibold">{{ uploadedFile.name }}</p>
                <p class="file-size text-sm">{{ formatFileSize(uploadedFile.size) }}</p>
              </div>
              <button (click)="removeFile()" 
                      class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <span class="text-lg">×</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Step 2: Upload Profile Picture -->
        <div *ngIf="currentStep === 2" class="text-center">
          <div class="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-6">
            <div class="w-8 h-8 bg-purple-500 rounded-full"></div>
          </div>
          
          <h2 class="text-2xl font-bold warm-text-primary mb-4">Add Your Photo</h2>
          <p class="warm-text-secondary mb-8 max-w-md mx-auto">
            Upload a professional headshot to personalize your landing page (optional)
          </p>
          
          <div *ngIf="!profilePicture" class="upload-zone max-w-md mx-auto">
            <div class="space-y-6 relative z-10">
              <div class="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto">
                <div class="w-10 h-10 bg-purple-500 rounded-full"></div>
              </div>
              
              <div>
                <p class="text-lg font-medium warm-text-primary mb-2">
                  Upload your photo
                </p>
                <p class="text-sm warm-text-light mb-4">
                  JPG, PNG • Max size 5MB
                </p>
              </div>
              
              <div class="space-x-4">
                <input type="file" 
                       id="profile-file-input"
                       class="hidden"
                       accept=".jpg,.jpeg,.png"
                       (change)="onProfileSelected($event)">
                <label for="profile-file-input" class="btn-primary cursor-pointer inline-flex items-center">
                  <span class="mr-2">+</span>
                  Choose Photo
                </label>
              </div>
            </div>
          </div>

          <div *ngIf="profilePicture" class="card max-w-sm mx-auto p-6">
            <div class="text-center space-y-4">
              <div class="w-24 h-24 rounded-full overflow-hidden mx-auto ring-4 ring-warm-coral shadow-lg">
                <img [src]="profilePicture" alt="Profile Picture" class="w-full h-full object-cover">
              </div>
              <div>
                <p class="font-semibold warm-text-primary">Looking great! 🎉</p>
                <p class="text-sm warm-text-secondary">Your photo is ready</p>
              </div>
              <button (click)="removeProfilePicture()" 
                      class="btn-ghost text-red-600 hover:bg-red-50">
                Change Photo
              </button>
            </div>
          </div>
        </div>

        <!-- Step 3: Generate CV Data -->
        <div *ngIf="currentStep === 3" class="text-center">
          <div class="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-6">
            <div class="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold">AI</span>
            </div>
          </div>
          
          <h2 class="text-2xl font-bold warm-text-primary mb-4">Generate Content</h2>
          <p class="warm-text-secondary mb-8 max-w-md mx-auto">
            Our AI will analyze your CV and create professional content for your landing page
          </p>
          
          <div *ngIf="!isProcessing && !cvData" class="space-y-6">
            <div class="card max-w-md mx-auto p-8 bg-gradient-to-br from-warm-cream to-warm-yellow">
              <div class="space-y-6">
                <div class="w-16 h-16 bg-gradient rounded-xl flex items-center justify-center mx-auto shadow-lg">
                  <span class="text-white font-bold text-2xl">⚡</span>
                </div>
                <div>
                  <h3 class="text-lg font-semibold warm-text-primary mb-2">Ready to Process</h3>
                  <p class="warm-text-secondary text-sm">
                    We'll extract your information and generate compelling content
                  </p>
                </div>
                <button (click)="startProcessing()" class="btn-primary w-full text-lg py-4">
                  Generate My Content
                </button>
              </div>
            </div>
          </div>

          <div *ngIf="isProcessing" class="space-y-6">
            <div class="card max-w-lg mx-auto p-8 bg-gradient-to-br from-warm-cream to-warm-beige">
              <div class="text-center space-y-6">
                <div class="loading-spinner w-8 h-8 mx-auto"></div>
                <div>
                  <h3 class="text-lg font-semibold warm-text-primary mb-2">Processing Your CV</h3>
                  <p class="warm-text-secondary text-sm">
                    This may take a few moments while we analyze your information
                  </p>
                </div>
              </div>
              
              <div class="mt-8 space-y-3">
                <div *ngFor="let phase of processingPhases" 
                     class="flex items-center justify-between text-sm">
                  <span class="warm-text-secondary">{{ phase.name }}</span>
                  <div class="flex items-center space-x-2">
                    <div *ngIf="phase.status === 'completed'" class="w-4 h-4 text-green-500">
                      <span class="font-bold">✓</span>
                    </div>
                    <div *ngIf="phase.status === 'processing'" class="loading-spinner w-4 h-4"></div>
                    <div *ngIf="phase.status === 'pending'" class="w-4 h-4 bg-warm-taupe rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="cvData && !isProcessing" class="text-center">
            <div class="status-success max-w-md mx-auto mb-6">
              <span class="font-bold mr-2">✓</span>
              Content generated successfully!
            </div>
            <p class="warm-text-secondary mb-6">
              Your CV has been processed and content is ready for review
            </p>
          </div>
        </div>

        <!-- Step 4: Edit Content -->
        <div *ngIf="currentStep === 4">
          <div class="text-center mb-8">
            <div class="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-6">
              <div class="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold">✎</span>
              </div>
            </div>
            <h2 class="text-2xl font-bold warm-text-primary mb-4">Review & Edit</h2>
            <p class="warm-text-secondary max-w-md mx-auto">
              Review the generated content and make any adjustments before creating your landing page
            </p>
          </div>
          
          <div class="space-y-6">
            <div *ngFor="let section of cvSections" class="card p-6">
              <div class="flex items-center mb-4">
                <div class="w-8 h-8 bg-warm-orange rounded-lg flex items-center justify-center mr-3">
                  <span class="text-white font-bold text-xs">{{ section.id.substring(0, 2).toUpperCase() }}</span>
                </div>
                <h3 class="text-lg font-semibold warm-text-primary">{{ section.title }}</h3>
              </div>
              
              <textarea 
                [(ngModel)]="section.content"
                [placeholder]="section.placeholder"
                [rows]="section.rows"
                class="textarea-field">
              </textarea>
              
              <div class="flex items-center justify-between mt-2">
                <span class="text-xs warm-text-light">{{ section.content.length || 0 }} characters</span>
                <button class="btn-ghost text-xs" (click)="resetSection(section)">
                  Reset to Original
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 5: Generate Website -->
        <div *ngIf="currentStep === 5" class="text-center">
          <div class="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-6">
            <div class="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold">🌐</span>
            </div>
          </div>
          
          <h2 class="text-2xl font-bold warm-text-primary mb-4">Create Your Website</h2>
          <p class="warm-text-secondary mb-8 max-w-md mx-auto">
            Generate your professional landing page with all your customized content
          </p>
          
          <div *ngIf="!isGeneratingWebsite && !websiteGenerated" class="space-y-6">
            <div class="card max-w-md mx-auto p-8 bg-gradient-to-br from-purple-50 to-pink-50">
              <div class="space-y-6">
                <div class="w-16 h-16 bg-gradient rounded-xl flex items-center justify-center mx-auto shadow-lg">
                  <span class="text-white font-bold text-2xl">🚀</span>
                </div>
                <div>
                  <h3 class="text-lg font-semibold warm-text-primary mb-2">Ready to Launch</h3>
                  <p class="warm-text-secondary text-sm">
                    Your content is polished and ready to become a beautiful website
                  </p>
                </div>
                <button (click)="generateWebsite()" class="btn-primary w-full text-lg py-4">
                  Create My Website
                </button>
              </div>
            </div>
          </div>

          <div *ngIf="isGeneratingWebsite" class="space-y-6">
            <div class="card max-w-lg mx-auto p-8">
              <div class="text-center space-y-6">
                <div class="loading-spinner w-8 h-8 mx-auto"></div>
                <div>
                  <h3 class="text-lg font-semibold warm-text-primary mb-2">Building Your Website</h3>
                  <p class="warm-text-secondary text-sm">
                    Crafting your beautiful landing page...
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="websiteGenerated" class="space-y-6">
            <div class="card max-w-lg mx-auto p-8 bg-green-50 border-green-200">
              <div class="text-center space-y-6">
                <div class="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto">
                  <span class="text-green-600 font-bold text-2xl">✓</span>
                </div>
                <div>
                  <h3 class="text-xl font-bold warm-text-primary mb-2">Website Created!</h3>
                  <p class="warm-text-secondary">
                    Your professional landing page is ready to share with the world
                  </p>
                </div>
                <div class="flex flex-col sm:flex-row gap-3 justify-center">
                  <button class="btn-primary">
                    <span class="mr-2">👁</span>
                    Preview Website
                  </button>
                  <button class="btn-secondary">
                    <span class="mr-2">📥</span>
                    Download Files
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Navigation Footer -->
      <div class="flex justify-between items-center mt-8 pt-6 border-t border-warm-peach">
        <button *ngIf="currentStep > 1 && currentStep < 5" 
                (click)="previousStep()" 
                class="btn-secondary">
          <span class="mr-2">←</span>
          Back
        </button>
        <div *ngIf="currentStep === 1 || currentStep === 5"></div>
        
        <div class="flex items-center space-x-4">
          <span class="text-sm warm-text-secondary">
            Step {{ currentStep }} of {{ wizardSteps.length }}
          </span>
          <button *ngIf="canProceed() && currentStep < 5" 
                  (click)="nextStep()" 
                  class="btn-primary">
            {{ getNextButtonText() }}
            <span class="ml-2">→</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Component-specific warm styling */
    .cv-wizard {
      min-height: 100vh;
    }

    .warm-text-primary {
      color: #3e2723;
    }

    .warm-text-secondary {
      color: #5d4037;
    }

    .warm-text-light {
      color: #8d6e63;
    }

    .bg-warm-cream {
      background-color: #fff4f1;
    }

    .bg-warm-orange {
      background-color: #ff6b35;
    }

    .bg-warm-coral {
      background-color: #ff8a65;
    }

    .bg-warm-peach {
      background-color: #ffb4a2;
    }

    .bg-warm-yellow {
      background-color: #fff9c4;
    }

    .bg-warm-beige {
      background-color: #f5f5dc;
    }

    .bg-warm-taupe {
      background-color: #a1887f;
    }

    .text-warm-orange {
      color: #ff6b35;
    }

    .border-warm-peach {
      border-color: #ffb4a2;
    }

    .border-warm-coral {
      border-color: #ff8a65;
    }

    .ring-warm-coral {
      --tw-ring-color: #ff8a65;
    }

    /* Wizard specific styling */
    .wizard-steps {
      background: white;
      border: 2px solid #ff8a65;
      border-radius: 20px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 20px rgba(255, 107, 53, 0.1);
    }

    .step-line {
      background: linear-gradient(to right, #ff8a65 0%, #ffb4a2 100%);
      height: 3px;
      border-radius: 2px;
    }

    .step-line.completed {
      background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
    }

    .upload-zone {
      border: 3px dashed #ff8a65;
      border-radius: 20px;
      padding: 3rem 2rem;
      text-align: center;
      transition: all 0.3s ease;
      background: linear-gradient(135deg, #fff4f1 0%, #f5f5dc 100%);
      color: #3e2723;
      position: relative;
      overflow: hidden;
    }

    .upload-zone::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255, 107, 53, 0.05) 0%, transparent 70%);
      animation: gentle-pulse 4s ease-in-out infinite;
    }

    @keyframes gentle-pulse {
      0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.5; }
      50% { transform: scale(1.1) rotate(180deg); opacity: 0.8; }
    }

    .upload-zone:hover {
      border-color: #ff6b35;
      background: white;
      transform: scale(1.02);
      box-shadow: 0 8px 30px rgba(255, 107, 53, 0.15);
    }

    .upload-zone.dragover {
      border-color: #ffa726;
      background: #fff9c4;
      transform: scale(1.05);
      box-shadow: 0 8px 30px rgba(255, 167, 38, 0.2);
    }

    /* File upload success card */
    .file-upload-card {
      background: linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%);
      border: 2px solid #81c784;
      border-radius: 16px;
      color: #2e7d32;
      box-shadow: 0 4px 20px rgba(76, 175, 80, 0.15);
    }

    .file-upload-card .file-name {
      color: #1b5e20;
      font-weight: 600;
    }

    .file-upload-card .file-size {
      color: #388e3c;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .wizard-steps {
        padding: 1rem;
      }
      
      .upload-zone {
        padding: 2rem 1rem;
      }
      
      .step-indicator {
        width: 2.5rem;
        height: 2.5rem;
        font-size: 0.9rem;
      }
    }
  `]
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
  ) {}

  ngOnInit() {
    this.progressSubscription = this.cvProcessingService.progress$.subscribe(
      (progress: ProcessingProgress) => {
        this.processingPhases = progress.phases;
        
        if (progress.completed && !progress.error) {
          this.isProcessing = false;
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
      const result = await this.cvProcessingService.processCV(this.uploadedFile, this.profilePicture || undefined);
      
      if (result.success) {
        this.cvData = result.data;
        this.populateCVSections();
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
}