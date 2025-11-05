import {Injectable, InjectionToken, Provider, inject} from '@angular/core';
import {getApp, getApps, initializeApp} from 'firebase/app';
import type {FirebaseOptions} from 'firebase/app';
import {
    GenerateContentStreamResult,
    GenerationConfig,
    GenerativeModel,
    SchemaRequest,
    SchemaType,
    VertexAIBackend,
    getAI,
    getGenerativeModel
} from '@firebase/ai';

import {
    AI_ADAPTER,
    AiAdapter,
    AiGenerationConfig,
    AiStreamingResult
} from '../../services/ai-adapter';
import {provideAiPromptConfig} from '../../config/ai-prompt.config';
import {AiSchemaRequest, AiSchemaType} from '../../utils/structured/structured-schema';

export interface FirebaseAiAdapterConfig {
    firebaseOptions: FirebaseOptions;
    model?: string;
    location?: string;
}

export interface FirebaseAiAdapterOptions extends FirebaseAiAdapterConfig {
    defaultGenerationConfig?: Partial<GenerationConfig>;
}

export const FIREBASE_AI_ADAPTER_CONFIG = new InjectionToken<FirebaseAiAdapterConfig>(
    'FIREBASE_AI_ADAPTER_CONFIG'
);

@Injectable()
export class FirebaseAiAdapter implements AiAdapter {

    private readonly adapterConfig = inject(FIREBASE_AI_ADAPTER_CONFIG);
    private model: GenerativeModel | null = null;

    async sendPrompt(
        prompt: string,
        config?: Partial<AiGenerationConfig> | null
    ): Promise<string> {
        const model = this.ensureModel();
        const generationConfig = this.prepareGenerationConfig(config);

        const result = await model.generateContent({
            contents: [{role: 'user', parts: [{text: prompt}]}],
            generationConfig
        });

        return result.response?.text() ?? '';
    }

    async streamPrompt(
        prompt: string,
        config?: Partial<AiGenerationConfig> | null
    ): Promise<AiStreamingResult> {
        const model = this.ensureModel();
        const generationConfig = this.prepareGenerationConfig(config);

        const result = await model.generateContentStream({
            contents: [{role: 'user', parts: [{text: prompt}]}],
            generationConfig
        });

        return {
            stream: this.toTextStream(result),
            finalResponse: this.resolveFinalResponse(result)
        };
    }

    private ensureModel(): GenerativeModel {
        if (this.model) {
            return this.model;
        }

        const {firebaseOptions, model, location} = this.adapterConfig;
        if (!firebaseOptions?.projectId) {
            throw new Error('Firebase configuration is missing projectId');
        }

        const app = getApps().length ? getApp() : initializeApp(firebaseOptions);
        const ai = getAI(app, {
            backend: new VertexAIBackend(location ?? undefined)
        });

        const modelName = model || 'gemini-2.5-flash-lite';
        this.model = getGenerativeModel(ai, {model: modelName});
        return this.model;
    }

    private prepareGenerationConfig(
        config?: Partial<AiGenerationConfig> | null
    ): GenerationConfig | undefined {
        if (!config) {
            return undefined;
        }

        const normalized: Record<string, unknown> = {...config};
        const schema = normalized['responseSchema'] as AiSchemaRequest | undefined;
        if (schema) {
            normalized['responseSchema'] = this.convertSchema(schema);
        }

        return normalized as GenerationConfig;
    }

    private toTextStream(
        result: GenerateContentStreamResult
    ): AsyncIterableIterator<string> {
        const stream = result.stream;
        const self = this;

        return (async function* () {
            const iterator = stream[Symbol.asyncIterator]();
            try {
                while (true) {
                    const {done, value} = await iterator.next();
                    if (done) {
                        return;
                    }

                    const text = self.extractText(value);
                    if (text) {
                        yield text;
                    }
                }
            } finally {
                if (typeof iterator.return === 'function') {
                    try {
                        await iterator.return(undefined);
                    } catch {
                        // Ignore cleanup errors; they'll surface elsewhere if relevant.
                    }
                }
            }
        })();
    }

    private resolveFinalResponse(result: GenerateContentStreamResult): Promise<string> {
        return result.response.then((response) => response?.text?.() ?? '');
    }

    private extractText(chunk: unknown): string | null {
        if (!chunk || typeof chunk !== 'object') {
            return null;
        }

        const text = (chunk as {text?: () => unknown}).text;
        if (typeof text !== 'function') {
            return null;
        }

        const value = text.call(chunk);
        return typeof value === 'string' ? value : null;
    }

    private convertSchema(schema: AiSchemaRequest): SchemaRequest {
        return {
            type: this.mapSchemaType(schema.type),
            description: schema.description,
            nullable: schema.nullable,
            enum: schema.enum ? [...schema.enum] : undefined,
            required: schema.required ? [...schema.required] : undefined,
            properties: schema.properties
                ? Object.fromEntries(
                      Object.entries(schema.properties).map(([key, value]) => [
                          key,
                          this.convertSchema(value)
                      ])
                  )
                : undefined,
            items: schema.items ? this.convertSchema(schema.items) : undefined
        };
    }

    private mapSchemaType(type: AiSchemaType): SchemaType {
        switch (type) {
            case AiSchemaType.ARRAY:
                return SchemaType.ARRAY;
            case AiSchemaType.OBJECT:
                return SchemaType.OBJECT;
            case AiSchemaType.BOOLEAN:
                return SchemaType.BOOLEAN;
            case AiSchemaType.NUMBER:
                return SchemaType.NUMBER;
            case AiSchemaType.INTEGER:
                return SchemaType.INTEGER;
            default:
                return SchemaType.STRING;
        }
    }
}

export function provideFirebaseAiAdapter(
    options: FirebaseAiAdapterOptions
): Provider[] {
    const {defaultGenerationConfig, ...adapterConfig} = options;

    const providers: Provider[] = [
        {
            provide: FIREBASE_AI_ADAPTER_CONFIG,
            useValue: adapterConfig
        },
        {
            provide: AI_ADAPTER,
            useClass: FirebaseAiAdapter
        }
    ];

    if (defaultGenerationConfig) {
        providers.push(
            provideAiPromptConfig({
                defaultGenerationConfig
            })
        );
    }

    return providers;
}
