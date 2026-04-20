import { Component } from '@angular/core';
import { CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent } from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';

@Component({
  selector: 'app-document-control',
  templateUrl: './document-control.component.html',
  styleUrls: ['./document-control.component.scss'],
  imports: [CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent, IconDirective]
})
export class DocumentControlComponent {
  title = 'Document Control';
  subtitle = 'Document management, versioning, and compliance records';
}
