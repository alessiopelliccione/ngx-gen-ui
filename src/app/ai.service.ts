import { Injectable } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GenerativeModel,
  GenerationConfig,
  GenerateContentStreamResult,
  getGenerativeModel,
  getVertexAI
} from '@firebase/vertexai-preview';

import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiService {

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
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      });

      return result.response?.text() ?? '';
    } catch (error) {
      console.error('Errore nella chiamata a Firebase AI:', error);
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
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      });
    } catch (error) {
      console.error(
        'Errore nella generazione streaming tramite Firebase AI:',
        error
      );
      throw error;
    }
  }

  private initializeModel(): GenerativeModel {
    const firebaseConfig = environment.firebase;
    if (!firebaseConfig?.projectId) {
      throw new Error('Firebase configuration is missing projectId');
    }

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const vertexAI = getVertexAI(app);

    const modelName = environment.firebaseVertexModel || 'gemini-1.5-flash';
    return getGenerativeModel(vertexAI, { model: modelName });
  }
}
