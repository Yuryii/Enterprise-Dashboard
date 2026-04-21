import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const oidcSecurityService = inject(OidcSecurityService);
  const router = inject(Router);

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
