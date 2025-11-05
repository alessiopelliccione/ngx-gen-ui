import {Component} from '@angular/core';

import {AiStructuredPromptDirective} from 'ngx-gen-ui';

@Component({
    selector: 'demo-recipe-profiles-page',
    standalone: true,
    imports: [AiStructuredPromptDirective],
    templateUrl: './recipe-profiles-page.component.html'
})
export class RecipeProfilesPageComponent {}
