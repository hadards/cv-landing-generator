import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule], // ← Make sure RouterModule is imported
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="card max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
        
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div class="flex items-center">
            <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span class="font-medium text-green-800">Authentication Working!</span>
          </div>
          <p class="text-green-700 text-sm mt-1">You are successfully logged in.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="card text-center">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Create New</h3>
            <p class="text-gray-600 text-sm mb-4">Upload a new CV to generate a landing page</p>
            <button routerLink="/upload" class="btn-primary w-full">Upload CV</button>
          </div>

          <div class="card text-center">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">0 Projects</h3>
            <p class="text-gray-600 text-sm mb-4">Landing pages you've created</p>
            <button class="btn-secondary w-full">View All</button>
          </div>

          <div class="card text-center">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
            <p class="text-gray-600 text-sm mb-4">View your page performance</p>
            <button class="btn-secondary w-full">View Stats</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {
}