import {Component} from '@angular/core';

import {
    AiPromptDirective,
    AiStructuredPromptDirective,
    StructuredLayoutDefinition
} from 'ngx-gen-ui';

@Component({
    selector: 'demo-home-page',
    standalone: true,
    imports: [AiPromptDirective, AiStructuredPromptDirective],
    templateUrl: './home-page.component.html'
})
export class HomePageComponent {

    readonly heroLayout: StructuredLayoutDefinition[] = [
        {tag: 'h1', label: 'Hero headline'},
        {tag: 'p', label: 'Supporting sentence'},
        {tag: 'a', label: 'Primary CTA button', attributes: ['href'], required: false},
        {tag: 'img', label: 'Hero visual', attributes: ['src', 'alt'], required: false}
    ];

    readonly featureLayout: StructuredLayoutDefinition[] = [
        {tag: 'h2', label: 'Features section title'},
        {
            tag: 'div',
            label: 'Feature list container',
            children: [
                {
                    tag: 'article',
                    label: 'Primary feature card',
                    children: [
                        {tag: 'h3', label: 'Feature name'},
                        {tag: 'p', label: 'Feature description'}
                    ]
                },
                {
                    tag: 'article',
                    label: 'Secondary feature card',
                    required: false,
                    children: [
                        {tag: 'h3', label: 'Feature name'},
                        {tag: 'p', label: 'Feature description'}
                    ]
                }
            ]
        }
    ];
}
