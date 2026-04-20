import { Component } from '@angular/core';
import { CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent } from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';

@Component({
  selector: 'app-information-services',
  templateUrl: './information-services.component.html',
  styleUrls: ['./information-services.component.scss'],
  imports: [CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent, IconDirective]
})
export class InformationServicesComponent {
  title = 'Information Services';
  subtitle = 'IT infrastructure, systems, and support';
}
