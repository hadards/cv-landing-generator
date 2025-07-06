import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, HealthResponse, TestResponse } from '../../services/api.service';

@Component({
  selector: 'app-api-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="card max-w-2xl mx-auto">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">API Connection Test</h2>
        
        <!-- Health Check -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-gray-900">Health Check</h3>
            <button (click)="testHealth()" 
                    [disabled]="loading"
                    class="btn-primary text-sm">
              {{ loading ? 'Testing...' : 'Test Health' }}
            </button>
          </div>
          
          <div *ngIf="healthResult" class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-center mb-2">
              <div [class]="healthResult.status === 'healthy' ? 'w-3 h-3 bg-green-500 rounded-full mr-2' : 'w-3 h-3 bg-red-500 rounded-full mr-2'"></div>
              <span class="font-medium">{{ healthResult.status }}</span>
            </div>
            <p class="text-sm text-gray-600">{{ healthResult.message }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ healthResult.timestamp }}</p>
          </div>
        </div>

        <!-- API Tests -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-gray-900">API Tests</h3>
            <div class="space-x-2">
              <button (click)="testGetRequest()" 
                      [disabled]="loading"
                      class="btn-secondary text-sm">
                Test GET
              </button>
              <button (click)="testPostRequest()" 
                      [disabled]="loading"
                      class="btn-primary text-sm">
                Test POST
              </button>
            </div>
          </div>
          
          <div *ngIf="testResult" class="bg-gray-50 rounded-lg p-4">
            <pre class="text-sm text-gray-700 whitespace-pre-wrap">{{ formatJson(testResult) }}</pre>
          </div>
        </div>

        <!-- Error Display -->
        <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex items-center">
            <span class="text-red-800 font-medium">Error: </span>
          </div>
          <p class="text-red-700 text-sm mt-1">{{ error }}</p>
        </div>
      </div>
    </div>
  `
})
export class ApiTestComponent implements OnInit {
  healthResult: HealthResponse | null = null;
  testResult: TestResponse | null = null;
  error: string | null = null;
  loading = false;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.testHealth();
  }

  testHealth() {
    this.loading = true;
    this.error = null;
    
    this.apiService.checkHealth().subscribe({
      next: (result) => {
        this.healthResult = result;
        this.loading = false;
      },
      error: (err) => {
        this.error = `Health check failed: ${err.message || 'Unknown error'}`;
        this.loading = false;
      }
    });
  }

  testGetRequest() {
    this.loading = true;
    this.error = null;
    
    this.apiService.testGet({ param1: 'test', param2: 'value' }).subscribe({
      next: (result) => {
        this.testResult = result;
        this.loading = false;
      },
      error: (err) => {
        this.error = `GET request failed: ${err.message || 'Unknown error'}`;
        this.loading = false;
      }
    });
  }

  testPostRequest() {
    this.loading = true;
    this.error = null;
    
    const testData = {
      message: 'Hello from Angular!',
      timestamp: new Date().toISOString(),
      testValue: 123
    };

    this.apiService.testPost(testData).subscribe({
      next: (result) => {
        this.testResult = result;
        this.loading = false;
      },
      error: (err) => {
        this.error = `POST request failed: ${err.message || 'Unknown error'}`;
        this.loading = false;
      }
    });
  }

  formatJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }
}