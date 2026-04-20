import { Component } from '@angular/core';
import { CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent } from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';

@Component({
  selector: 'app-shipping-receiving',
  templateUrl: './shipping-receiving.component.html',
  styleUrls: ['./shipping-receiving.component.scss'],
  imports: [CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent, IconDirective]
})
export class ShippingReceivingComponent {
  title = 'Shipping & Receiving';
  subtitle = 'Logistics, shipment tracking, and warehouse operations';
}
