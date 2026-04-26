import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-roles-home',
  standalone: true,
  imports: [],
  templateUrl: './roles-home.component.html',
  styleUrl: './roles-home.component.scss'
})
export class RolesHomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    const userRoles: string[] = await this.authService.getRoles();

    const departmentRouteMap: Record<string, string> = {
      'Executive': '/roles/executive',
      'HumanResources': '/roles/human-resources',
      'Finance': '/roles/finance',
      'Information-Services': '/roles/information-services',
      'Facilities-And-Maintenance': '/roles/facilities',
      'Production': '/roles/production',
      'Production-Control': '/roles/production-control',
      'Sales': '/roles/sales',
      'Marketing': '/roles/marketing',
      'Purchasing': '/roles/purchasing',
      'Quality-Assurance': '/roles/quality-assurance',
      'Document-Control': '/roles/document-control',
      'Engineering': '/roles/engineering',
      'Tool-Design': '/roles/tool-design',
      'Shipping-and-Receiving': '/roles/shipping-receiving',
    };

    const target = userRoles
      .map(r => departmentRouteMap[r])
      .find(route => !!route) ?? '/dashboard';

    this.router.navigate([target]);
  }
}
