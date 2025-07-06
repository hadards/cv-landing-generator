import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FileUploadComponent],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-4">Upload Your CV</h1>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          Upload your CV and we'll extract your professional information to create a stunning landing page
        </p>
      </div>

      <app-file-upload></app-file-upload>
    </div>
  `
})
export class UploadComponent {
}