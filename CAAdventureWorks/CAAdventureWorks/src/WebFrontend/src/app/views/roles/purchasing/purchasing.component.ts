import { Component } from '@angular/core';
import { CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent } from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';

@Component({
  selector: 'app-purchasing',
  templateUrl: './purchasing.component.html',
  styleUrls: ['./purchasing.component.scss'],
  imports: [CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent, IconDirective]
})
export class PurchasingComponent {
  title = 'Purchasing';
  subtitle = 'Vendor management, purchase orders, and inventory';
}
