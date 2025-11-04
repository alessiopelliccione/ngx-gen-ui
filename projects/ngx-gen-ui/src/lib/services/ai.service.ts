import {Injectable, inject} from '@angular/core';
import {getApp, getApps, initializeApp} from 'firebase/app';
import {
    GenerateContentStreamResult,
    GenerationConfig,
    GenerativeModel,
    getGenerativeModel,
    getVertexAI
} from '@firebase/vertexai-preview';

import {AI_PROMPT_CONFIG} from '../config/ai-prompt.config';

@Injectable({
    providedIn: 'root'
})
export class AiService {

    private readonly config = inject(AI_PROMPT_CONFIG, {
        optional: false
    });

    private readonly model = this.initializeModel();

    async sendPrompt(
        prompt: string,
        config?: Partial<GenerationConfig>
    ): Promise<string> {
        try {
            const generationConfig: GenerationConfig = {
                temperature: 0,
                ...config
            };

            const result = await this.model.generateContent({
                contents: [{role: 'user', parts: [{text: prompt}]}],
                generationConfig
            });

            return result.response?.text() ?? '';
        } catch (error) {
            console.error('Error while calling Firebase AI:', error);
            throw error;
        }
    }

    async streamPrompt(
        prompt: string,
        config?: Partial<GenerationConfig>
    ): Promise<GenerateContentStreamResult> {
        try {
            const generationConfig: GenerationConfig = {
                temperature: 0,
                ...config
            };

            return await this.model.generateContentStream({
                contents: [{role: 'user', parts: [{text: prompt}]}],
                generationConfig
            });
        } catch (error) {
            console.error('Error during Firebase AI streaming generation:', error);
            throw error;
        }
    }

    private initializeModel(): GenerativeModel {
        const {firebaseOptions, model} = this.config;
        if (!firebaseOptions?.projectId) {
            throw new Error('Firebase configuration is missing projectId');
        }

        const app = getApps().length ? getApp() : initializeApp(firebaseOptions);
        const vertexAI = getVertexAI(app);

        const modelName = model || 'gemini-2.5-flash';
        return getGenerativeModel(vertexAI, {model: modelName});
    }
}
