import { Component } from '@angular/core';

import { AiPromptDirective, AiStructuredPromptDirective } from 'ngx-gen-ui';

@Component({
  selector: 'app-root',
    imports: [AiPromptDirective, AiStructuredPromptDirective, AiStructuredPromptDirective],
  templateUrl: './app.html'
})
export class AppComponent {}
