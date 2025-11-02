import { InjectionToken, Provider } from '@angular/core';
import { FirebaseOptions } from 'firebase/app';

export interface AiPromptConfig {
  firebaseOptions: FirebaseOptions;
  model?: string;
}

export const AI_PROMPT_CONFIG = new InjectionToken<AiPromptConfig>(
  'AI_PROMPT_CONFIG'
);

export function provideAiPromptConfig(config: AiPromptConfig): Provider {
  return {
    provide: AI_PROMPT_CONFIG,
    useValue: config
  };
}
