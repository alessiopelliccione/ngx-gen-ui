import {
  Directive,
  ElementRef,
  Renderer2,
  booleanAttribute,
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

  readonly camelStream = input(false, {
    alias: 'aiStream',
    transform: booleanAttribute
  });

  readonly kebabStream = input(false, {
    alias: 'ai-stream',
    transform: booleanAttribute
  });

  private readonly normalizedPrompt = computed(() => {
    const kebab = this.kebabPrompt();
    const camel = this.camelPrompt();
    return kebab || camel;
  });

  private readonly resolvedGenerationConfig = computed(
    () => this.generationConfig() ?? this.generationConfigKebab() ?? null
  );

  private readonly streamingEnabled = computed(
    () => (this.camelStream() || this.kebabStream())
  );

  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly aiService = inject(AiService);

  private requestId = 0;
  private lastRequestSignature: string | null = null;
  private readonly wordTypingDelay = 45;

  constructor() {
    effect(() => {
      const prompt = this.normalizedPrompt();
      const generationConfig = this.resolvedGenerationConfig();
      const streaming = this.streamingEnabled();

      const signature = `${prompt ?? ''}__${streaming}__${
        generationConfig ? JSON.stringify(generationConfig) : 'null'
      }`;

      if (this.lastRequestSignature === signature) {
        return;
      }
      this.lastRequestSignature = signature;

      if (!prompt) {
        this.renderer.setProperty(
          this.elementRef.nativeElement,
          'textContent',
          ''
        );
        return;
      }

      const currentId = ++this.requestId;

      this.renderer.setProperty(
        this.elementRef.nativeElement,
        'textContent',
        ''
      );

      if (streaming) {
        this.handleStreamingRequest(prompt, generationConfig, currentId);
      } else {
        this.handleNonStreamingRequest(prompt, generationConfig, currentId);
      }
    });
  }

  private handleNonStreamingRequest(
    prompt: string,
    generationConfig: Partial<GenerationConfig> | null,
    currentId: number
  ): void {
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
        this.handleRequestError(error, currentId);
      });
  }

  private handleStreamingRequest(
    prompt: string,
    generationConfig: Partial<GenerationConfig> | null,
    currentId: number
  ): void {
    this.aiService
      .streamPrompt(prompt, generationConfig ?? undefined)
      .then(async ({ stream, response }) => {
        let bufferedText = '';

        try {
          for await (const chunk of stream) {
            if (currentId !== this.requestId) {
              if (typeof stream.return === 'function') {
                try {
                  await stream.return(undefined);
                } catch {
                  // ignore generator completion errors
                }
              }
              return;
            }

            let chunkText = '';
            try {
              chunkText = chunk.text();
            } catch (error) {
              this.handleRequestError(error, currentId);
              return;
            }

            if (!chunkText) {
              continue;
            }

            const addition = chunkText.startsWith(bufferedText)
              ? chunkText.slice(bufferedText.length)
              : chunkText;
            bufferedText = await this.typewriteAddition(
              addition,
              bufferedText,
              currentId
            );

            if (!addition && chunkText !== bufferedText) {
              bufferedText = chunkText;
              this.renderer.setProperty(
                this.elementRef.nativeElement,
                'textContent',
                bufferedText
              );
            }
          }

          const finalResponse = await response;
          if (currentId !== this.requestId) {
            return;
          }

          let finalText = bufferedText;
          try {
            finalText = finalResponse?.text() ?? bufferedText;
          } catch (error) {
            this.handleRequestError(error, currentId);
            return;
          }

          this.renderer.setProperty(
            this.elementRef.nativeElement,
            'textContent',
            finalText
          );
        } catch (error) {
          this.handleRequestError(error, currentId);
        }
      })
      .catch((error) => {
        this.handleRequestError(error, currentId);
      });
  }

  private handleRequestError(error: unknown, currentId: number): void {
    if (currentId !== this.requestId) {
      return;
    }
    console.error('Errore durante la generazione del contenuto:', error);
    this.renderer.setProperty(
      this.elementRef.nativeElement,
      'textContent',
      ''
    );
  }

  private async typewriteAddition(
    addition: string,
    bufferedText: string,
    currentId: number
  ): Promise<string> {
    if (!addition) {
      return bufferedText;
    }

    const tokens = addition.match(/\S+\s*/g) ?? [addition];

    for (const token of tokens) {
      if (currentId !== this.requestId) {
        return bufferedText;
      }

      bufferedText += token;

      this.renderer.setProperty(
        this.elementRef.nativeElement,
        'textContent',
        bufferedText
      );

      await this.delay(this.wordTypingDelay);
    }

    return bufferedText;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
