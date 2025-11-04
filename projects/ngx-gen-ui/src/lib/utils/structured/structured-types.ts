import {GenerationConfig} from '@firebase/vertexai-preview';

export interface StructuredElement {
    tag: string;
    content: string | null;
    attributes: Record<string, string>;
    children: StructuredElement[];
}

export type StructuredGenerationConfig = Partial<GenerationConfig> & {
    responseMimeType?: string;
    responseSchema?: unknown;
};
