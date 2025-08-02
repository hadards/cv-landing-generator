import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadService, UploadProgress } from '../../services/file-upload.service';
import { Subscription } from 'rxjs';
import { LandingPageService } from '../../services/landing-page.service';

@Component({
    selector: 'app-file-upload',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="max-w-4xl mx-auto">
      <!-- Upload Area -->
      <div *ngIf="!uploadProgress || uploadProgress.status === 'error'" 
           class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
           [class.border-red-300]="uploadProgress?.status === 'error'"
           (dragover)="onDragOver($event)"
           (dragleave)="onDragLeave($event)"
           (drop)="onDrop($event)">
        
        <div class="space-y-4">
          <div class="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <span class="text-sm font-semibold text-blue-600">CV</span>
          </div>
          
          <div>
            <h3 class="text-lg font-medium text-gray-900">Upload your CV</h3>
            <p class="text-gray-600">Drag and drop your CV file here, or click to browse</p>
            <p class="text-sm text-gray-500 mt-2">Supports PDF, DOC, and DOCX files (max 10MB)</p>
          </div>
          
          <div>
            <input type="file" 
                   id="file-input"
                   class="hidden"
                   accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                   (change)="onFileSelected($event)">
            <label for="file-input" class="btn-primary cursor-pointer inline-block">
              Choose File
            </label>
          </div>
        </div>
      </div>

      <!-- Profile Picture Upload (show after CV is processed) -->
        <div *ngIf="uploadProgress?.status === 'completed' && !profilePicture" 
            class="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center mt-6">
        <div class="space-y-4">
            <div class="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span class="text-xs font-semibold text-blue-600">PHOTO</span>
            </div>
            
            <div>
            <h3 class="text-lg font-medium text-gray-900">Add Your Profile Picture</h3>
            <p class="text-gray-600">Upload a professional headshot for your landing page</p>
            <p class="text-sm text-gray-500 mt-2">Supports JPG, PNG files (max 5MB)</p>
            </div>
            
            <div>
            <input type="file" 
                    id="profile-input"
                    class="hidden"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    (change)="onProfilePictureSelected($event)">
            <label for="profile-input" class="btn-secondary cursor-pointer inline-block">
                Choose Profile Picture
            </label>
            </div>
        </div>
        </div>

        <!-- Profile Picture Preview -->
        <div *ngIf="profilePicture" class="bg-white rounded-lg border border-gray-200 p-6 mt-6">
        <h4 class="text-lg font-medium text-gray-900 mb-4">Profile Picture</h4>
        <div class="flex items-center space-x-4">
            <img [src]="profilePicture" alt="Profile Picture" class="w-20 h-20 rounded-full object-cover">
            <div class="flex-1">
            <p class="text-sm text-gray-600">Profile picture ready!</p>
            <button (click)="removeProfilePicture()" class="text-red-600 hover:text-red-700 text-sm mt-1">
                Remove Picture
            </button>
            </div>
        </div>
        </div>

      <!-- Upload Progress -->
      <div *ngIf="uploadProgress && uploadProgress.status !== 'error'" class="space-y-4">
        <!-- Progress Bar -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">
              {{ uploadProgress.status === 'uploading' ? 'Uploading CV...' : 
                 uploadProgress.status === 'processing' ? 'Processing CV...' : 
                 'CV Processed Successfully!' }}
            </h3>
            <span class="text-sm font-medium text-gray-700">{{ uploadProgress.percentage }}%</span>
          </div>
          
          <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                 [style.width.%]="uploadProgress.percentage"></div>
          </div>
          
          <p class="text-sm text-gray-600">{{ uploadProgress.message }}</p>
          
          <!-- File Info -->
          <div *ngIf="uploadProgress.file" class="mt-4 p-3 bg-gray-50 rounded border">
            <div class="flex items-center space-x-3">
              <div class="w-5 h-5 bg-gray-200 rounded flex items-center justify-center">
                <span class="text-xs text-gray-600">F</span>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900">{{ uploadProgress.file.originalName }}</p>
                <p class="text-xs text-gray-500">{{ formatFileSize(uploadProgress.file.size) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Extracted Text Preview -->
        <div *ngIf="uploadProgress.status === 'completed' && uploadProgress.extractedText" 
             class="bg-white rounded-lg border border-gray-200 p-6">
          <h4 class="text-lg font-medium text-gray-900 mb-4">Extracted CV Content</h4>
          <div class="bg-gray-50 rounded border p-4 max-h-96 overflow-y-auto">
            <pre class="text-sm text-gray-700 whitespace-pre-wrap font-mono">{{ uploadProgress.extractedText }}</pre>
          </div>
          
          <div class="mt-6 flex space-x-4">
            <button class="btn-primary">Continue to Preview</button>
            <button (click)="startOver()" class="btn-secondary">Upload Another CV</button>
          </div>
        </div>

        <!-- Continue to Generation -->
        <div *ngIf="uploadProgress.status === 'completed' && uploadProgress.extractedText" 
            class="bg-white rounded-lg border border-gray-200 p-6">
        <h4 class="text-lg font-medium text-gray-900 mb-4">Extracted CV Content</h4>
        <div class="bg-gray-50 rounded border p-4 max-h-96 overflow-y-auto">
            <pre class="text-sm text-gray-700 whitespace-pre-wrap font-mono">{{ uploadProgress.extractedText }}</pre>
        </div>
        
        <div class="mt-6 flex space-x-4">
            <button (click)="generateLandingPage()" 
                    [disabled]="generatingPage"
                    class="btn-primary">
            {{ generatingPage ? 'Generating...' : 'Generate Landing Page' }}
            </button>
            <button (click)="startOver()" class="btn-secondary">Upload Another CV</button>
        </div>
        </div>

        <!-- Generation Result -->
        <div *ngIf="generationResult" class="bg-white rounded-lg border border-gray-200 p-6 mt-4">
        <div class="flex items-center mb-4">
            <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                <span class="text-xs font-bold text-green-600">✓</span>
            </div>
            <h4 class="text-lg font-medium text-gray-900">Landing Page Generated!</h4>
        </div>
        
        <p class="text-gray-600 mb-4">{{ generationResult.message }}</p>
        
        <div class="bg-gray-50 rounded border p-4 mb-4">
            <h5 class="font-medium text-gray-900 mb-2">Generated Files:</h5>
            <ul class="text-sm text-gray-600 list-disc list-inside">
            <li *ngFor="let file of generationResult.generation.files">{{ file }}</li>
            </ul>
        </div>
        
        <div class="flex space-x-4">
            <button class="btn-primary">Deploy to GitHub</button>
            <button (click)="previewLandingPage()" class="btn-secondary">Preview</button>
            <button (click)="startOver()" class="btn-secondary">Create Another</button>
        </div>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="uploadProgress?.status === 'error'" 
           class="bg-red-50 border border-red-200 rounded-lg p-6">
        <div class="flex items-center">
          <div class="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mr-2">
            <span class="text-xs font-bold text-red-600">!</span>
          </div>
          <span class="text-red-800 font-medium">Upload Failed</span>
        </div>
        <p class="text-red-700 text-sm mt-1">{{ uploadProgress?.message }}</p>
        <button (click)="startOver()" class="btn-primary mt-4">Try Again</button>
      </div>
    </div>
  `
})
export class FileUploadComponent implements OnInit, OnDestroy {
    uploadProgress: UploadProgress | null = null;
    profilePicture: string | null = null;
    private subscription?: Subscription;

    generatingPage = false;
    generationResult: any = null;

    constructor(
        private fileUploadService: FileUploadService,
        private landingPageService: LandingPageService
    ) { }

    ngOnInit() {
        this.subscription = this.fileUploadService.uploadProgress$.subscribe(
            progress => this.uploadProgress = progress
        );
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

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
            this.uploadFile(files[0]);
        }
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.uploadFile(input.files[0]);
        }
    }

    private uploadFile(file: File) {
        this.fileUploadService.uploadFile(file).subscribe();
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    startOver() {
        this.fileUploadService.clearProgress();
        this.uploadProgress = null;
        this.profilePicture = null; // Add this line
        this.generationResult = null; // Add this line
    }

    onProfilePictureSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];

            // Validate file
            if (!this.validateImageFile(file)) {
                alert('Please select a valid image file (JPG or PNG, max 5MB)');
                return;
            }

            // Compress and convert to base64
            this.compressAndConvertImage(file);
        }
    }

    private compressAndConvertImage(file: File) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // Set canvas size (max 400x400 for profile pictures)
            const maxSize = 400;
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

            // Draw and compress
            ctx?.drawImage(img, 0, 0, width, height);

            // Convert to base64 with compression (0.8 quality)
            this.profilePicture = canvas.toDataURL('image/jpeg', 0.8);

            console.log('Compressed image size:', this.profilePicture.length);
        };

        img.src = URL.createObjectURL(file);
    }

    removeProfilePicture() {
        this.profilePicture = null;
    }

    private validateImageFile(file: File): boolean {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        return allowedTypes.includes(file.type) && file.size <= maxSize;
    }

    generateLandingPage() {
        if (!this.uploadProgress?.extractedText) return;

        this.generatingPage = true;

        // Get structured data from upload progress
        let structuredData = (this.uploadProgress as any).structuredData;

        if (!structuredData) {
            alert('No structured data available. Please process the CV first.');
            this.generatingPage = false;
            return;
        }

        // Add profile picture to structured data
        if (this.profilePicture) {
            structuredData = {
                ...structuredData,
                personalInfo: {
                    ...structuredData.personalInfo,
                    profilePicture: this.profilePicture
                }
            };
        }

        this.landingPageService.generateLandingPage(structuredData).subscribe({
            next: (result) => {
                this.generatingPage = false;
                this.generationResult = result;
                console.log('Landing page generated:', result);
            },
            error: (error) => {
                this.generatingPage = false;
                console.error('Generation failed:', error);
                alert('Failed to generate landing page: ' + (error.error?.message || error.message));
            }
        });
    }

    previewLandingPage() {
        if (!this.generationResult) return;

        // For now, just show an alert
        alert('Preview functionality will be implemented with GitHub integration');
    }
}