import {Component} from '@angular/core';

import {AiStructuredPromptDirective} from 'ngx-gen-ui';

@Component({
    selector: 'demo-creative-showcase-page',
    standalone: true,
    imports: [AiStructuredPromptDirective],
    templateUrl: './creative-showcase-page.component.html'
})
export class CreativeShowcasePageComponent {}
