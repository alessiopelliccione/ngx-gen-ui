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

interface RequestOptions {
  prompt: string | null;
  config: Partial<GenerationConfig> | null;
  streaming: boolean;
  allowHtml: boolean;
}

interface ActiveRequest extends RequestOptions {
  prompt: string;
}

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

  readonly camelAllowHtml = input(false, {
    alias: 'aiAllowHtml',
    transform: booleanAttribute
  });

  readonly kebabAllowHtml = input(false, {
    alias: 'ai-allow-html',
    transform: booleanAttribute
  });

  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly aiService = inject(AiService);

  private readonly resolvedOptions = computed<RequestOptions>(() => ({
    prompt: this.kebabPrompt() || this.camelPrompt() || null,
    config: this.generationConfig() ?? this.generationConfigKebab() ?? null,
    streaming: this.camelStream() || this.kebabStream(),
    allowHtml: this.camelAllowHtml() || this.kebabAllowHtml()
  }));

  private requestId = 0;
  // Tracks the last evaluated inputs so equal inputs don't trigger duplicate requests.
  private lastSignature: string | null = null;

  constructor() {
    effect(() => {
      const options = this.resolvedOptions();
      const signature = this.createSignature(options);

      if (this.lastSignature === signature) {
        return;
      }
      this.lastSignature = signature;

      if (!options.prompt) {
        this.renderContent('', options.allowHtml);
        return;
      }

      const currentId = ++this.requestId;
      this.renderContent('', options.allowHtml);

      const request: ActiveRequest = {
        prompt: options.prompt,
        config: options.config,
        streaming: options.streaming,
        allowHtml: options.allowHtml
      };

      if (request.streaming) {
        void this.handleStreamingRequest(request, currentId);
      } else {
        void this.handleNonStreamingRequest(request, currentId);
      }
    });
  }

  private async handleNonStreamingRequest(
    { prompt, config, allowHtml }: ActiveRequest,
    currentId: number
  ): Promise<void> {
    try {
      const response = await this.aiService.sendPrompt(
        prompt,
        config ?? undefined
      );
      if (currentId !== this.requestId) {
        return;
      }
      this.renderContent(response ?? '', allowHtml);
    } catch (error) {
      this.handleRequestError(error, currentId);
    }
  }

  private async handleStreamingRequest(
    { prompt, config, allowHtml }: ActiveRequest,
    currentId: number
  ): Promise<void> {
    try {
      const { stream, response } = await this.aiService.streamPrompt(
        prompt,
        config ?? undefined
      );

      const iterator = stream as AsyncIterableIterator<unknown>;
      let displayedText = '';

      for await (const chunk of iterator) {
        if (currentId !== this.requestId) {
          await this.closeStream(iterator);
          return;
        }

        const chunkText = this.extractText(chunk);
        if (!chunkText) {
          continue;
        }

        const addition = chunkText.startsWith(displayedText)
          ? chunkText.slice(displayedText.length)
          : chunkText;

        displayedText = addition ? displayedText + addition : chunkText;
        this.renderContent(displayedText, allowHtml);
      }

      if (currentId !== this.requestId) {
        return;
      }

      const finalResponse = await response;
      const finalText = this.extractText(finalResponse);
      const resolvedText =
        finalText && finalText.length >= displayedText.length ? finalText : displayedText;
      this.renderContent(resolvedText ?? '', allowHtml);
    } catch (error) {
      this.handleRequestError(error, currentId);
    }
  }

  private createSignature({ prompt, config, streaming, allowHtml }: RequestOptions): string {
    return JSON.stringify({
      prompt: prompt ?? '',
      streaming,
      config: config ?? null,
      allowHtml
    });
  }

  private renderContent(content: string, allowHtml: boolean): void {
    const property = allowHtml ? 'innerHTML' : 'textContent';
    this.renderer.setProperty(this.elementRef.nativeElement, property, content);
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

  private handleRequestError(error: unknown, currentId: number): void {
    if (currentId !== this.requestId) {
      return;
    }
    console.error('Error while generating AI content:', error);
    this.renderContent('', this.resolvedOptions().allowHtml);
  }
}
