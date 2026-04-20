import { Component } from '@angular/core';
import { CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent } from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';

@Component({
  selector: 'app-marketing',
  templateUrl: './marketing.component.html',
  styleUrls: ['./marketing.component.scss'],
  imports: [CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent, IconDirective]
})
export class MarketingComponent {
  title = 'Marketing';
  subtitle = 'Campaigns, lead generation, and marketing analytics';
}
