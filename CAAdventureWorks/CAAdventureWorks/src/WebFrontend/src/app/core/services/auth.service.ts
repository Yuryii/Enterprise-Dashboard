import { inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private oidcSecurityService = inject(OidcSecurityService);

  isAuthenticated$ = this.oidcSecurityService.isAuthenticated$.pipe(
    map((result) => result.isAuthenticated)
  );

  userData$ = this.oidcSecurityService.userData$.pipe(
    map((result) => result.userData as any)
  );

  accessToken$: Observable<string> = this.oidcSecurityService.getAccessToken();
  idToken$: Observable<string> = this.oidcSecurityService.getIdToken();

  login(): void {
    this.oidcSecurityService.authorize();
  }

  logout(): void {
    this.oidcSecurityService.logoff();
  }

  async getRoles(): Promise<string[]> {
    const userData = await firstValueFrom(this.oidcSecurityService.getUserData());
    return (userData as any)?.realm_access?.roles ?? [];
  }

  hasRole(role: string): boolean {
    // Note: This is a sync check using the last known user data.
    // For a proper check, use hasRoleAsync() or evaluate in component with async pipe.
    return false;
  }

  async hasRoleAsync(role: string): Promise<boolean> {
    const roles = await this.getRoles();
    return roles.includes(role);
  }

  async hasAnyRole(roles: string[]): Promise<boolean> {
    const userRoles = await this.getRoles();
    const result = roles.some((role) =>
      userRoles.some(
        (userRole) => userRole.toLowerCase() === role.toLowerCase()
      )
    );
    console.log('[AuthService] hasAnyRole check:', roles, 'User roles:', userRoles, 'Result:', result);
    return result;
  }

  async getUserName(): Promise<string> {
    const userData = await firstValueFrom(this.oidcSecurityService.getUserData());
    const data = userData as any;
    return (
      data?.name ||
      data?.preferred_username ||
      data?.email ||
      'Unknown User'
    );
  }

  async getUserEmail(): Promise<string> {
    const userData = await firstValueFrom(this.oidcSecurityService.getUserData());
    return (userData as any)?.email || '';
  }
}
