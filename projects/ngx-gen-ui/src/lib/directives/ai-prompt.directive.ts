import {Directive, booleanAttribute, computed, input} from '@angular/core';

import {PromptSignatureOptions} from '../services/prompt-engine.service';
import {
    PromptDirectiveBase,
    PromptDirectiveBaseOptions
} from './prompt-directive.base';
import {AiGenerationConfig} from '../services/ai-adapter';

interface RequestOptions extends PromptDirectiveBaseOptions {
    streaming: boolean;
}

@Directive({
    selector: '[aiPrompt],[ai-prompt]'
})
export class AiPromptDirective extends PromptDirectiveBase<RequestOptions> {

    readonly camelPrompt = input('', {alias: 'aiPrompt'});

    readonly kebabPrompt = input('', {alias: 'ai-prompt'});

    readonly generationConfig = input<Partial<AiGenerationConfig> | null>(null, {
        alias: 'aiGeneration'
    });

    readonly generationConfigKebab = input<Partial<AiGenerationConfig> | null>(
        null,
        {alias: 'ai-generation'}
    );

    readonly camelStream = input(false, {
        alias: 'aiStream',
        transform: booleanAttribute
    });

    readonly kebabStream = input(false, {
        alias: 'ai-stream',
        transform: booleanAttribute
    });

    protected readonly options = computed<RequestOptions>(() => ({
        prompt: this.kebabPrompt() || this.camelPrompt() || null,
        config: this.generationConfig() ?? this.generationConfigKebab() ?? null,
        streaming: this.camelStream() || this.kebabStream()
    }));

    constructor() {
        super();
    }

    protected override toSignatureOptions(options: RequestOptions): PromptSignatureOptions {
        return {
            prompt: options.prompt,
            config: options.config,
            streaming: options.streaming
        };
    }

    protected override async executeRequest(
        options: RequestOptions,
        controller: AbortController
    ): Promise<void> {
        const request = this.buildRequest(options);

        if (options.streaming) {
            const finalContent = await this.directiveService.streamPrompt(
                request,
                {
                    onUpdate: (content): void => {
                        if (this.isAborted(controller)) return;
                        this.renderResult(content, options);
                    }
                },
                controller.signal
            );

            if (this.isAborted(controller)) return;

            this.renderResult(finalContent ?? '', options);
            return;
        }

        const response = await this.directiveService.generatePrompt(
            request,
            controller.signal
        );

        if (this.isAborted(controller)) return;
        this.renderResult(response ?? '', options);
    }
}
