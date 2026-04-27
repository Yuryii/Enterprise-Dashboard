import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { Observable, firstValueFrom, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private oidcSecurityService = inject(OidcSecurityService);
  private router = inject(Router);
  private useMockAuth = !environment.production && (environment as any).useMockAuth;

  isAuthenticated$ = this.useMockAuth
    ? of(true)
    : this.oidcSecurityService.isAuthenticated$.pipe(
        map((result) => result.isAuthenticated),
      );

  userData$ = this.useMockAuth
    ? of({ name: 'Mock User', email: 'mock@example.com', preferred_username: 'mockuser' })
    : this.oidcSecurityService.userData$.pipe(
        map((result) => result.userData as any),
      );

  accessToken$: Observable<string> = this.useMockAuth
    ? of('mock-access-token')
    : this.oidcSecurityService.getAccessToken();
    
  idToken$: Observable<string> = this.useMockAuth
    ? of('mock-id-token')
    : this.oidcSecurityService.getIdToken();

  login(): void {
    if (this.useMockAuth) {
      console.log('[AuthService] Mock authentication - login bypassed');
      return;
    }
    this.oidcSecurityService.authorize();
  }

  logout(): void {
    if (this.useMockAuth) {
      console.log('[AuthService] Mock authentication - performing logout');
      // Clear any stored data
      localStorage.clear();
      sessionStorage.clear();
      // Redirect to login or home page
      window.location.href = '/';
      return;
    }
    this.oidcSecurityService.logoff().subscribe(() => {
      console.log('[AuthService] Logged out successfully');
    });
  }

  /**
   * Returns both Keycloak roles AND policy names the user can access.
   * Policy names are derived by expanding which policies the user's Keycloak roles grant access to.
   */
  async getRoles(): Promise<string[]> {
    // Mock roles for development
    // Change this array to test different roles:
    // - For Sales: ['Sales']
    // - For HR: ['HumanResources']
    // - For Purchasing: ['Purchasing']
    // - For Executive (all access): ['Executive']
    if (this.useMockAuth) {
      // Return all roles so any developer role can access the Alerts page during dev.
      // The AlertService filters definitions by department based on the actual role returned here.
      return [
        'Sales',
        'Executive',
        'Production',
        'Purchasing',
        'Marketing',
        'HumanResources',
        'Finance',
        'Quality-Assurance',
        'Document-Control',
        'Engineering',
        'Tool-Design',
        'Shipping-and-Receiving',
        'Facilities-And-Maintenance',
        'Information-Services',
      ];
    }

    const token = await firstValueFrom(
      this.oidcSecurityService.getAccessToken(),
    );
    if (!token) return [];

    const payload = JSON.parse(atob(token.split('.')[1]));
    const keycloakRoles: string[] = payload?.realm_access?.roles ?? [];

    // Simply return the roles from Keycloak without expansion
    // This ensures each department only sees their own dashboard
    console.log('[AuthService] Keycloak roles:', keycloakRoles);
    return keycloakRoles;
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
        (userRole) => userRole.toLowerCase() === role.toLowerCase(),
      ),
    );
    console.log(
      '[AuthService] hasAnyRole check:',
      roles,
      'User roles:',
      userRoles,
      'Result:',
      result,
    );
    return result;
  }

  async getUserName(): Promise<string> {
    if (this.useMockAuth) {
      return 'Mock User (Development)';
    }
    
    const userData = await firstValueFrom(
      this.oidcSecurityService.getUserData(),
    );
    const data = userData as any;
    return (
      data?.name || data?.preferred_username || data?.email || 'Unknown User'
    );
  }

  async getUserEmail(): Promise<string> {
    if (this.useMockAuth) {
      return 'mock@example.com';
    }
    
    const userData = await firstValueFrom(
      this.oidcSecurityService.getUserData(),
    );
    return (userData as any)?.email || '';
  }
}
