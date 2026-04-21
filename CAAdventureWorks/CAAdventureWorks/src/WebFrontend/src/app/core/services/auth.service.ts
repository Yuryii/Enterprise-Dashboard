import { inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private oidcSecurityService = inject(OidcSecurityService);

  isAuthenticated$ = this.oidcSecurityService.isAuthenticated$.pipe(
    map((result) => result.isAuthenticated),
  );

  userData$ = this.oidcSecurityService.userData$.pipe(
    map((result) => result.userData as any),
  );

  accessToken$: Observable<string> = this.oidcSecurityService.getAccessToken();
  idToken$: Observable<string> = this.oidcSecurityService.getIdToken();

  login(): void {
    this.oidcSecurityService.authorize();
  }

  logout(): void {
    this.oidcSecurityService.logoff();
  }

  /**
   * Returns both Keycloak roles AND policy names the user can access.
   * Policy names are derived by expanding which policies the user's Keycloak roles grant access to.
   */
  async getRoles(): Promise<string[]> {
    const token = await firstValueFrom(
      this.oidcSecurityService.getAccessToken(),
    );
    if (!token) return [];

    const payload = JSON.parse(atob(token.split('.')[1]));
    const keycloakRoles: string[] = payload?.realm_access?.roles ?? [];

    // Policy names that a given Keycloak role grants access to
    const policyAccessMap: Record<string, string[]> = {
      Executive: ['Executive'],
      'Information-Services': [
        'Information-Services',
        'Executive-General-And-Administration-Manager',
      ],
      Finance: ['Finance', 'Executive-General-And-Administration-Manager'],
      HumanResources: [
        'Human-Resources',
        'Executive-General-And-Administration-Manager',
      ],
      'Facilities-And-Maintenance': [
        'Facilities-And-Maintenance',
        'Executive-General-And-Administration-Manager',
      ],
      'Quality-Assurance': ['Quality-Assurance', 'Quality-Assurance-Manager'],
      'Document-Control': ['Document-Control', 'Quality-Assurance-Manager'],
      Engineering: ['Engineering', 'Research-and-Development'],
      'Tool-Design': ['Tool-Design', 'Research-and-Development'],
      Production: ['Production', 'Manufacturing'],
      'Production-Control': ['Production-Control', 'Manufacturing'],
      Sales: ['Sales', 'Sales-and-Marketing'],
      Marketing: ['Marketing', 'Sales-and-Marketing'],
      Purchasing: ['Inventory-Management'],
      'Shipping-and-Receiving': ['Shipping-and-Receiving'],
    };

    const policies = new Set<string>();
    for (const role of keycloakRoles) {
      policies.add(role);
      const accessiblePolicies = policyAccessMap[role];
      if (accessiblePolicies) {
        accessiblePolicies.forEach((p) => policies.add(p));
      }
    }

    return Array.from(policies);
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
    const userData = await firstValueFrom(
      this.oidcSecurityService.getUserData(),
    );
    const data = userData as any;
    return (
      data?.name || data?.preferred_username || data?.email || 'Unknown User'
    );
  }

  async getUserEmail(): Promise<string> {
    const userData = await firstValueFrom(
      this.oidcSecurityService.getUserData(),
    );
    return (userData as any)?.email || '';
  }
}
