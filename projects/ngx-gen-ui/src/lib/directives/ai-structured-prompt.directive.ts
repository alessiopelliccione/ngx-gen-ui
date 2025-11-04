import {Directive, booleanAttribute, computed, input} from '@angular/core';
import {GenerationConfig} from '@firebase/vertexai-preview';

import {
    PromptDirectiveBase,
    PromptDirectiveBaseOptions
} from './prompt-directive.base';
import {
    PromptRequestOptions,
    PromptSignatureOptions
} from '../services/prompt-engine.service';
import {prepareStructuredPrompt, renderStructuredData} from '../utils/structured-data.utils';

interface StructuredRequestOptions extends PromptDirectiveBaseOptions {}

@Directive({
    selector: '[aiStructuredPrompt],[ai-structured-prompt]'
})
export class AiStructuredPromptDirective extends PromptDirectiveBase<StructuredRequestOptions> {

    readonly camelPrompt = input('', {alias: 'aiStructuredPrompt'});

    readonly kebabPrompt = input('', {alias: 'ai-structured-prompt'});

    readonly camelGeneration = input<Partial<GenerationConfig> | null>(null, {
        alias: 'aiStructuredGeneration'
    });

    readonly kebabGeneration = input<Partial<GenerationConfig> | null>(
        null,
        {alias: 'ai-structured-generation'}
    );

    readonly camelAllowHtml = input(false, {
        alias: 'aiStructuredAllowHtml',
        transform: booleanAttribute
    });

    readonly kebabAllowHtml = input(false, {
        alias: 'ai-structured-allow-html',
        transform: booleanAttribute
    });

    protected readonly options = computed<StructuredRequestOptions>(() => ({
        prompt: this.kebabPrompt() || this.camelPrompt() || null,
        config: this.camelGeneration() ?? this.kebabGeneration() ?? null,
        allowHtml: this.camelAllowHtml() || this.kebabAllowHtml()
    }));

    constructor() {
        super();
    }

    protected override toSignatureOptions(options: StructuredRequestOptions): PromptSignatureOptions {
        return {
            prompt: options.prompt,
            config: options.config,
            streaming: false,
            allowHtml: options.allowHtml
        };
    }

    protected override buildRequest(options: StructuredRequestOptions): PromptRequestOptions {
        const baseRequest = super.buildRequest(options);
        return {
            ...baseRequest,
            prompt: prepareStructuredPrompt(baseRequest.prompt)
        };
    }

    protected override async executeRequest(
        options: StructuredRequestOptions,
        controller: AbortController
    ): Promise<void> {
        const request = this.buildRequest(options);
        const response = await this.directiveService.generatePrompt(request, controller.signal);

        if (this.isAborted(controller)) return;


        this.renderResult(response ?? '', options);
    }

    protected override renderResult(content: string, options: StructuredRequestOptions): void {
        renderStructuredData(
            this.renderer,
            this.elementRef.nativeElement,
            content,
            options.allowHtml
        );
    }

    protected override renderEmpty(options: StructuredRequestOptions): void {
        this.renderResult('', options);
    }

    protected override handleError(
        error: unknown,
        options: StructuredRequestOptions,
        controller: AbortController
    ): void {
        if (this.isAborted(controller)) return;
        console.error('Error while generating structured AI content:', error);
        this.renderEmpty(options);
    }
}
