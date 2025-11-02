import { Component } from '@angular/core';

import { AiPromptDirective } from 'ngx-gen-ui';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AiPromptDirective],
  templateUrl: './app.html'
})
export class AppComponent {}
