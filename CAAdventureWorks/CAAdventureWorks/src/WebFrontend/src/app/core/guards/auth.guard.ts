import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { map, take } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  
  // Bypass authentication in development mode with mock auth
  if (!environment.production && (environment as any).useMockAuth) {
    console.log('[AuthGuard] Mock authentication enabled - bypassing auth check');
    return of(true);
  }

  const oidcSecurityService = inject(OidcSecurityService);

  return oidcSecurityService.isAuthenticated$.pipe(
    take(1),
    map((result) => {
      if (!result.isAuthenticated) {
        router.navigate(['/login']);
        return false;
      }
      return true;
    })
  );
};
