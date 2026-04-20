import { Component } from '@angular/core';
import { CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent, TitleComponent } from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';

@Component({
  selector: 'app-executive',
  templateUrl: './executive.component.html',
  styleUrls: ['./executive.component.scss'],
  imports: [CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent, TitleComponent, IconDirective]
})
export class ExecutiveComponent {
  title = 'Executive Dashboard';
  subtitle = 'Full access to all organizational data and reports';
}
