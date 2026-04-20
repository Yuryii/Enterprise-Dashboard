/// <reference types="@angular/localize" />
import { bootstrapApplication } from '@angular/platform-browser';
import { inject } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).then(() => {
  const oidcSecurityService = inject(OidcSecurityService);
  oidcSecurityService.checkAuth().subscribe();
});
