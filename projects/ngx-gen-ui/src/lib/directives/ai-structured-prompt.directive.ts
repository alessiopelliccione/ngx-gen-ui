import {Directive, computed, input} from '@angular/core';

import {
    PromptDirectiveBase,
    PromptDirectiveBaseOptions
} from './prompt-directive.base';
import {
    PromptRequestOptions,
    PromptSignatureOptions
} from '../services/prompt-engine.service';
import {
    createStructuredResponseConfig,
    prepareStructuredPrompt,
    renderStructuredData,
    StructuredLayoutDefinition
} from '../utils/structured-data.utils';
import {AiGenerationConfig} from '../services/ai-adapter';

interface StructuredRequestOptions extends PromptDirectiveBaseOptions {
    layout: StructuredLayoutDefinition[] | null;
}

@Directive({
    selector: '[aiStructuredPrompt],[ai-structured-prompt]'
})
export class AiStructuredPromptDirective extends PromptDirectiveBase<StructuredRequestOptions> {

    readonly camelPrompt = input('', {alias: 'aiStructuredPrompt'});

    readonly kebabPrompt = input('', {alias: 'ai-structured-prompt'});

    readonly camelGeneration = input<Partial<AiGenerationConfig> | null>(null, {
        alias: 'aiStructuredGeneration'
    });

    readonly kebabGeneration = input<Partial<AiGenerationConfig> | null>(
        null,
        {alias: 'ai-structured-generation'}
    );

    readonly structuredLayout = input<StructuredLayoutDefinition[] | null>(null, {
        alias: 'aiStructuredLayout'
    });

    readonly structuredLayoutKebab = input<StructuredLayoutDefinition[] | null>(null, {
        alias: 'ai-structured-layout'
    });

    protected readonly options = computed<StructuredRequestOptions>(() => ({
        prompt: this.kebabPrompt() || this.camelPrompt() || null,
        config: this.camelGeneration() ?? this.kebabGeneration() ?? null,
        layout: this.structuredLayout() ?? this.structuredLayoutKebab() ?? null
    }));

    constructor() {
        super();
    }

    protected override toSignatureOptions(options: StructuredRequestOptions): PromptSignatureOptions {
        return {
            prompt: options.prompt,
            config: options.config,
            streaming: false
        };
    }

    protected override buildRequest(options: StructuredRequestOptions): PromptRequestOptions {
        const baseRequest = super.buildRequest(options);
        const layout = options.layout ?? null;
        const structuredConfig = createStructuredResponseConfig(layout);
        const userConfig = baseRequest.config ?? undefined;
        const mergedConfig = {
            ...userConfig,
            ...structuredConfig,
            responseMimeType: structuredConfig.responseMimeType,
            responseSchema: structuredConfig.responseSchema
        };

        return {
            ...baseRequest,
            prompt: prepareStructuredPrompt(baseRequest.prompt, layout),
            config: mergedConfig
        };
    }

    protected override async executeRequest(
        options: StructuredRequestOptions,
        controller: AbortController
    ): Promise<void> {
        const request = this.buildRequest(options);
        const response = await this.directiveService.generatePrompt(request, controller.signal);

        if (this.isAborted(controller)) {
            return;
        }

        this.renderResult(response ?? '', options);
    }

    protected override renderResult(content: string, options: StructuredRequestOptions): void {
        renderStructuredData(
            this.renderer,
            this.elementRef.nativeElement,
            content
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
        if (this.isAborted(controller)) {
            return;
        }
        console.error('Error while generating structured AI content:', error);
        this.renderEmpty(options);
    }
}
