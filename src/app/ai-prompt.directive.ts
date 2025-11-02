import {
  Directive,
  ElementRef,
  Renderer2,
  computed,
  effect,
  inject,
  input
} from '@angular/core';
import { GenerationConfig } from '@firebase/vertexai-preview';

import { AiService } from './ai.service';

@Directive({
  selector: '[aiPrompt],[ai-prompt]',
  standalone: true
})
export class AiPromptDirective {

    readonly camelPrompt = input('', { alias: 'aiPrompt' });

  readonly kebabPrompt = input('', { alias: 'ai-prompt' });

  readonly generationConfig = input<Partial<GenerationConfig> | null>(null, {
    alias: 'aiGeneration'
  });

  readonly generationConfigKebab = input<Partial<GenerationConfig> | null>(
    null,
    { alias: 'ai-generation' }
  );

  private readonly normalizedPrompt = computed(() => {
    const kebab = this.kebabPrompt();
    const camel = this.camelPrompt();
    return kebab || camel;
  });

  private readonly resolvedGenerationConfig = computed(
    () => this.generationConfig() ?? this.generationConfigKebab() ?? null
  );

  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly aiService = inject(AiService);

  private requestId = 0;

  constructor() {
    effect(() => {
      const prompt = this.normalizedPrompt();
      const generationConfig = this.resolvedGenerationConfig();
      const currentId = ++this.requestId;

      this.aiService
        .sendPrompt(prompt, generationConfig ?? undefined)
        .then((response) => {
          if (currentId !== this.requestId) {
            return;
          }
          this.renderer.setProperty(
            this.elementRef.nativeElement,
            'textContent',
            response
          );
        })
        .catch((error) => {
          if (currentId !== this.requestId) {
            return;
          }
          console.error('Errore durante la generazione del contenuto:', error);
          this.renderer.setProperty(
            this.elementRef.nativeElement,
            'textContent',
            ''
          );
        });
    });
  }
}
