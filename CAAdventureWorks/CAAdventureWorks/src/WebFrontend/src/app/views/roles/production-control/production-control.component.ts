import { Component } from '@angular/core';
import { CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent } from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';

@Component({
  selector: 'app-production-control',
  templateUrl: './production-control.component.html',
  styleUrls: ['./production-control.component.scss'],
  imports: [CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent, IconDirective]
})
export class ProductionControlComponent {
  title = 'Production Control';
  subtitle = 'Production scheduling, work order management, and quality control';
}
