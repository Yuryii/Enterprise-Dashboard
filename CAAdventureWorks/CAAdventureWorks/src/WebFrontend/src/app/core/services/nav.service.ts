import { Injectable, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { INavData } from '@coreui/angular';
import { AuthService } from './auth.service';
import { navItems, NavRole } from '../../layout/default-layout/_nav';

@Injectable({ providedIn: 'root' })
export class NavService {
  private authService = inject(AuthService);
  private filteredNavItemsSubject = new BehaviorSubject<INavData[]>([]);
  private userRoles: string[] = [];

  filteredNavItems$: Observable<INavData[]> = this.filteredNavItemsSubject.asObservable();

  constructor() {
    this.filterNavItems();
  }

  async filterNavItems(): Promise<void> {
    this.userRoles = await this.authService.getRoles();
    console.log('[NavService] User roles from Keycloak:', this.userRoles);
    const filtered = this.getFilteredItems(navItems, this.userRoles);
    console.log('[NavService] Filtered nav items count:', filtered.length);
    this.filteredNavItemsSubject.next(filtered);
  }

  private getFilteredItems(items: INavData[], userRoles: string[]): INavData[] {
    return items
      .map((item) => this.processNavItem(item, userRoles))
      .filter((item) => item !== null) as INavData[];
  }

  private processNavItem(item: INavData, userRoles: string[]): INavData | null {
    // Check if item has role requirements
    if ('roles' in item && item.roles) {
      const navRole = item as NavRole;
      // Case-insensitive comparison
      const requiredRoles = navRole.roles ?? [];
      const hasAccess = requiredRoles.some((role) =>
        userRoles.some(
          (userRole) =>
            userRole.toLowerCase() === role.toLowerCase()
        )
      );
      console.log('[NavService] Item:', navRole.name, 'Required roles:', requiredRoles, 'Has access:', hasAccess);
      if (!hasAccess) {
        return null;
      }
    }

    // Recursively filter children
    if (item.children && item.children.length > 0) {
      const filteredChildren = item.children
        .map((child) => this.processNavItem(child, userRoles))
        .filter((child) => child !== null) as INavData[];

      if (filteredChildren.length === 0 && !item.url) {
        return null;
      }

      return {
        ...item,
        children: filteredChildren
      };
    }

    return item;
  }

  async hasAccess(requiredRoles: string[]): Promise<boolean> {
    if (!this.userRoles.length) {
      this.userRoles = await this.authService.getRoles();
    }
    const hasAccess = requiredRoles.some((role) =>
      this.userRoles.some(
        (userRole) =>
          userRole.toLowerCase() === role.toLowerCase()
      )
    );
    console.log('[NavService] hasAccess check:', requiredRoles, '->', hasAccess, 'User roles:', this.userRoles);
    return hasAccess;
  }

  getUserRoles(): string[] {
    return this.userRoles;
  }
}
