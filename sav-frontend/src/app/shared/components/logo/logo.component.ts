import { Component, input, output } from '@angular/core';

/**
 * Shared Logo Component
 * Displays the premium branding icon and name.
 */
@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [],
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss']
})
export class LogoComponent {
  /** Whether the parent container (like sidebar) is collapsed */
  readonly collapsed = input(false);
  
  /** Emitted when the branding icon is clicked */
  readonly logoClick = output<void>();

  onIconClick(): void {
    this.logoClick.emit();
  }
}
