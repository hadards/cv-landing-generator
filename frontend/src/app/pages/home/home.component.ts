import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          CV Landing Generator
        </h1>
        <p class="text-xl text-gray-600 mb-8">
          Transform your CV into a professional landing page
        </p>
        <div class="card max-w-md mx-auto">
          <h2 class="text-xl font-semibold mb-4">Home Page</h2>
          <p class="text-gray-600">
            This is the home page. The full design will come later.
          </p>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent {
}