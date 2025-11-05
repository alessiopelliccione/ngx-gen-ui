import {InjectionToken, Provider} from '@angular/core';

import {AiGenerationConfig} from '../services/ai-adapter';

export interface AiPromptConfig<TConfig extends AiGenerationConfig = AiGenerationConfig> {
    defaultGenerationConfig?: Partial<TConfig>;
}

export const AI_PROMPT_CONFIG = new InjectionToken<AiPromptConfig>(
    'AI_PROMPT_CONFIG'
);

export function provideAiPromptConfig<TConfig extends AiGenerationConfig = AiGenerationConfig>(
    config: AiPromptConfig<TConfig>
): Provider {
    return {
        provide: AI_PROMPT_CONFIG,
        useValue: config
    };
}
