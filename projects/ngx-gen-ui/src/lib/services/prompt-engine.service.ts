import {Injectable} from '@angular/core';

import {AiService} from './ai.service';
import {AiGenerationConfig} from './ai-adapter';

export interface PromptRequestOptions {
    prompt: string;
    config?: Partial<AiGenerationConfig> | null;
}

export interface PromptSignatureOptions {
    prompt: string | null;
    config: Partial<AiGenerationConfig> | null;
    streaming: boolean;
}

export interface PromptStreamHandlers {
    onUpdate(content: string): void;
}

@Injectable({
    providedIn: 'root'
})
export class PromptEngineService {

    constructor(
        private readonly aiService: AiService
    ) {}

    createSignature({
        prompt,
        config,
        streaming
    }: PromptSignatureOptions): string {
        return JSON.stringify({
            prompt: prompt ?? '',
            config: config ?? null,
            streaming
        });
    }

    async generatePrompt(
        request: PromptRequestOptions,
        signal?: AbortSignal
    ): Promise<string> {
        if (!request.prompt.trim()) {
            return '';
        }

        if (signal?.aborted) {
            return '';
        }

        const response = await this.aiService.sendPrompt(
            request.prompt,
            request.config ?? undefined
        );

        if (signal?.aborted) {
            return '';
        }

        return response ?? '';
    }

    async streamPrompt(
        request: PromptRequestOptions,
        handlers: PromptStreamHandlers,
        signal?: AbortSignal
    ): Promise<string> {
        const {stream, finalResponse} = await this.aiService.streamPrompt(
            request.prompt,
            request.config ?? undefined
        );

        const iterator = stream;
        let displayedText = '';

        while (true) {
            if (signal?.aborted) {
                await this.closeStream(iterator);
                return '';
            }

            const {done, value} = await iterator.next();
            if (done) {
                break;
            }

            const chunkText = typeof value === 'string' ? value : '';
            if (!chunkText) {
                continue;
            }

            const addition = chunkText.startsWith(displayedText)
                ? chunkText.slice(displayedText.length)
                : chunkText;

            displayedText = addition ? displayedText + addition : chunkText;
            handlers.onUpdate(displayedText);
        }

        if (signal?.aborted) {
            await this.closeStream(iterator);
            return '';
        }

        const finalText = await finalResponse;
        return finalText && finalText.length >= displayedText.length ? finalText : displayedText;
    }

    private async closeStream(
        iterator: AsyncIterableIterator<string>
    ): Promise<void> {
        if (typeof iterator.return !== 'function') {
            return;
        }
        try {
            await iterator.return(undefined);
        } catch {
            // Best-effort shutdown; errors will be surfaced elsewhere if relevant.
        }
    }
}
