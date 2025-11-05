import {InjectionToken} from '@angular/core';

/**
 * Shape of the configuration object that can be passed to AI generation requests.
 * The structure is intentionally loose so that individual adapters can interpret
 * provider-specific options while preserving a common contract for consumers.
 */
export interface AiGenerationConfig {
    temperature?: number;
    topK?: number;
    topP?: number;
    responseMimeType?: string;
    responseSchema?: unknown;
    [key: string]: unknown;
}

/**
 * Normalized streaming response emitted by AI adapters.
 */
export interface AiStreamingResult {
    stream: AsyncIterableIterator<string>;
    finalResponse: Promise<string>;
}

/**
 * Contract that concrete AI provider adapters must satisfy.
 */
export interface AiAdapter {
    sendPrompt(
        prompt: string,
        config?: Partial<AiGenerationConfig> | null
    ): Promise<string>;

    streamPrompt(
        prompt: string,
        config?: Partial<AiGenerationConfig> | null
    ): Promise<AiStreamingResult>;
}

export const AI_ADAPTER = new InjectionToken<AiAdapter>('AI_ADAPTER');
