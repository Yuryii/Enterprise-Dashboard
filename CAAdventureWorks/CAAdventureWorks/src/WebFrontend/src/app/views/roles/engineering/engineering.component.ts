import { Component } from '@angular/core';
import { CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent } from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';

@Component({
  selector: 'app-engineering',
  templateUrl: './engineering.component.html',
  styleUrls: ['./engineering.component.scss'],
  imports: [CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent, IconDirective]
})
export class EngineeringComponent {
  title = 'Engineering';
  subtitle = 'R&D, product design, and technical specifications';
}
