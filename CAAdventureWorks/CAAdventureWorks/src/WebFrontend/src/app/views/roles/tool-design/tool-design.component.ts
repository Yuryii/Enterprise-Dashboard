import { Component } from '@angular/core';
import { CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent } from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';

@Component({
  selector: 'app-tool-design',
  templateUrl: './tool-design.component.html',
  styleUrls: ['./tool-design.component.scss'],
  imports: [CardComponent, CardBodyComponent, CardHeaderComponent, RowComponent, ColComponent, IconDirective]
})
export class ToolDesignComponent {
  title = 'Tool Design';
  subtitle = 'Tool engineering, CAD designs, and manufacturing specifications';
}
