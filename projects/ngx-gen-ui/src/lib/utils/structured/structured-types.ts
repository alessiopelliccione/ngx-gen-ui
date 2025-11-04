import {GenerationConfig} from '@firebase/vertexai-preview';

export interface StructuredElement {
    tag: string;
    content: string | null;
    attributes: Record<string, string>;
    children: StructuredElement[];
}

export interface StructuredLayoutNode {
    tag: string;
    label?: string;
    required?: boolean;
    attributes?: string[];
    children?: StructuredLayoutDefinition[];
}

export type StructuredLayoutDefinition = string | StructuredLayoutNode;

export type StructuredGenerationConfig = Partial<GenerationConfig> & {
    responseMimeType?: string;
    responseSchema?: unknown;
};
