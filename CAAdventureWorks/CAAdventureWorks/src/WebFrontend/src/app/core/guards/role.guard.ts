import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

export const roleGuard = (requiredRoles: string[]): CanActivateFn => {
  return async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const isAuthenticated = await firstValueFrom(authService.isAuthenticated$);

    if (!isAuthenticated) {
      router.navigate(['/login']);
      return false;
    }

    const hasAnyRole = await authService.hasAnyRole(requiredRoles);
    if (hasAnyRole) {
      return true;
    }

    router.navigate(['/dashboard']);
    return false;
  };
};
