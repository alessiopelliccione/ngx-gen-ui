import {
    ElementRef,
    Renderer2,
    Signal,
    effect,
    inject
} from '@angular/core';

import {
    PromptEngineService,
    PromptRequestOptions,
    PromptSignatureOptions
} from '../services/prompt-engine.service';
import {AiGenerationConfig} from '../services/ai-adapter';

export interface PromptDirectiveBaseOptions {
    prompt: string | null;
    config: Partial<AiGenerationConfig> | null;
}

export abstract class PromptDirectiveBase<TOptions extends PromptDirectiveBaseOptions> {

    protected abstract readonly options: Signal<TOptions>;

    private abortController: AbortController | null = null;
    private lastSignature: string | null = null;

    protected readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
    protected readonly renderer = inject(Renderer2);
    protected readonly directiveService = inject(PromptEngineService);

    protected constructor() {
        effect(() => {
            const options = this.options();
            const signature = this.directiveService.createSignature(
                this.toSignatureOptions(options)
            );

            if (this.lastSignature === signature) return;

            this.lastSignature = signature;

            this.cancelActiveRequest();

            if (!options.prompt) {
                this.renderEmpty(options);
                return;
            }

            this.renderInitial(options);

            const controller = new AbortController();
            this.abortController = controller;

            void this.executeRequest(options, controller)
                .catch((error) => {
                    this.handleError(error, options, controller);
                })
                .finally(() => {
                    if (this.abortController === controller) {
                        this.abortController = null;
                    }
                });
        });
    }

    protected abstract toSignatureOptions(options: TOptions): PromptSignatureOptions;

    protected abstract executeRequest(
        options: TOptions,
        controller: AbortController
    ): Promise<void>;

    protected buildRequest(options: TOptions): PromptRequestOptions {
        return {
            prompt: options.prompt ?? '',
            config: options.config ?? null
        };
    }

    protected renderResult(content: string, _options: TOptions): void {
        this.renderTextContent(content);
    }

    protected renderInitial(options: TOptions): void {
        this.renderEmpty(options);
    }

    protected renderEmpty(options: TOptions): void {
        this.renderResult('', options);
    }

    protected isAborted(controller: AbortController): boolean {
        return controller.signal.aborted;
    }

    protected renderTextContent(content: string): void {
        this.renderer.setProperty(this.elementRef.nativeElement, 'textContent', content);
    }

    protected handleError(
        error: unknown,
        options: TOptions,
        controller: AbortController
    ): void {
        if (this.isAborted(controller)) return;
        console.error('Error while generating AI content:', error);
        this.renderEmpty(options);
    }

    protected cancelActiveRequest(): void {
        if (!this.abortController) return;
        this.abortController.abort();
        this.abortController = null;
    }
}
