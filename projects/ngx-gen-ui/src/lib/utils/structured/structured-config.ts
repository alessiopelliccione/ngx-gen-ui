import {StructuredGenerationConfig} from './structured-types';

export const STRUCTURED_PROMPT_SUFFIX = `

Return only a valid JSON array. Each item must be an object that describes an HTML element with:
- "tag": the HTML tag name (for example "h1", "p", "img").
- "content": optional string with the text content or primary value for the element.
- "attributes": optional object of HTML attributes (for example {"src": "...", "alt": "..."}).
Do not include explanations or Markdown fences.`;

export const STRUCTURED_RESPONSE_SCHEMA = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            tag: {
                type: 'string',
                description: 'HTML tag name such as h1, p, button, img.'
            },
            content: {
                type: 'string',
                nullable: true,
                description: 'Primary text content or value for the element.'
            },
            attributes: {
                type: 'object',
                nullable: true,
                properties: {
                    src: {type: 'string', nullable: true},
                    alt: {type: 'string', nullable: true},
                    href: {type: 'string', nullable: true},
                    target: {type: 'string', nullable: true},
                    rel: {type: 'string', nullable: true},
                    class: {type: 'string', nullable: true},
                    id: {type: 'string', nullable: true},
                    role: {type: 'string', nullable: true},
                    ariaLabel: {type: 'string', nullable: true}
                }
            }
        },
        required: ['tag']
    }
} as const;

export const STRUCTURED_RESPONSE_CONFIG: StructuredGenerationConfig = {
    responseMimeType: 'application/json',
    responseSchema: STRUCTURED_RESPONSE_SCHEMA
};

export function prepareStructuredPrompt(basePrompt: string): string {
    return `${basePrompt}${STRUCTURED_PROMPT_SUFFIX}`;
}
