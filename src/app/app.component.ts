import { Component } from '@angular/core';

import { AiPromptDirective } from './ai-prompt.directive';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AiPromptDirective],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {}
