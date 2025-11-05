import {Inject, Injectable, Optional} from '@angular/core';

import {
    AI_ADAPTER,
    AiAdapter,
    AiGenerationConfig,
    AiStreamingResult
} from './ai-adapter';
import {AI_PROMPT_CONFIG, AiPromptConfig} from '../config/ai-prompt.config';

@Injectable({
    providedIn: 'root'
})
export class AiService {

    constructor(
        @Inject(AI_ADAPTER) private readonly adapter: AiAdapter,
        @Optional() @Inject(AI_PROMPT_CONFIG) private readonly promptConfig?: AiPromptConfig
    ) {}

    async sendPrompt(
        prompt: string,
        config?: Partial<AiGenerationConfig>
    ): Promise<string> {
        try {
            const generationConfig = this.mergeGenerationConfig(config);
            return await this.adapter.sendPrompt(prompt, generationConfig);
        } catch (error) {
            console.error('Error while generating AI content:', error);
            throw error;
        }
    }

    async streamPrompt(
        prompt: string,
        config?: Partial<AiGenerationConfig>
    ): Promise<AiStreamingResult> {
        try {
            const generationConfig = this.mergeGenerationConfig(config);
            return await this.adapter.streamPrompt(prompt, generationConfig);
        } catch (error) {
            console.error('Error while streaming AI content:', error);
            throw error;
        }
    }

    private mergeGenerationConfig(
        config?: Partial<AiGenerationConfig> | null
    ): Partial<AiGenerationConfig> | undefined {
        const defaults = this.promptConfig?.defaultGenerationConfig;
        if (!defaults && !config) {
            return undefined;
        }
        return {
            ...(defaults ?? {}),
            ...(config ?? {})
        };
    }
}
