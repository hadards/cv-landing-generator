import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'upload',
    loadComponent: () => import('./pages/upload/upload.component').then(m => m.UploadComponent)
  },
  {
    path: 'test',
    loadComponent: () => import('./components/api-test/api-test.component').then(m => m.ApiTestComponent)
  },
  {
    path: 'github-debug',
    loadComponent: () => import('./components/github-debug/github-debug.component').then(m => m.GitHubDebugComponent)
  },
  {
    path: '**',
    redirectTo: '/home'
  }
];