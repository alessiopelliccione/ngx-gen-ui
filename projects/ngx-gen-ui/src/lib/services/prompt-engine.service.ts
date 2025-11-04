import {Injectable} from '@angular/core';
import {GenerationConfig} from '@firebase/vertexai-preview';

import {AiService} from './ai.service';

export interface PromptRequestOptions {
    prompt: string;
    config?: Partial<GenerationConfig> | null;
}

export interface PromptSignatureOptions {
    prompt: string | null;
    config: Partial<GenerationConfig> | null;
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
        const {stream, response} = await this.aiService.streamPrompt(
            request.prompt,
            request.config ?? undefined
        );

        const iterator = stream as AsyncIterableIterator<unknown>;
        let displayedText = '';

        for await (const chunk of iterator) {
            if (signal?.aborted) {
                await this.closeStream(iterator);
                return '';
            }

            const chunkText = this.extractText(chunk);
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
            return '';
        }

        const finalResponse = await response;
        const finalText = this.extractText(finalResponse);
        return finalText && finalText.length >= displayedText.length ? finalText : displayedText;
    }

    private extractText(source: unknown): string | null {
        if (!source || typeof source !== 'object') {
            return null;
        }

        const text = (source as { text?: () => unknown }).text;
        if (typeof text !== 'function') {
            return null;
        }

        const value = text.call(source);
        return typeof value === 'string' ? value : null;
    }

    private async closeStream(
        iterator: AsyncIterableIterator<unknown>
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
