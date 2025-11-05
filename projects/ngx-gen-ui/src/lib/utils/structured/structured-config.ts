import {
    StructuredGenerationConfig,
    StructuredLayoutDefinition,
    StructuredLayoutNode
} from './structured-types';
import {AiSchemaRequest, AiSchemaType} from './structured-schema';

const DEFAULT_ATTRIBUTES = [
    'src',
    'alt',
    'href',
    'target',
    'rel',
    'style',
    'class',
    'id',
    'role',
    'ariaLabel',
    'title'
] as const;

export const STRUCTURED_PROMPT_SUFFIX = `

Return only a valid JSON array. Each item must be an object that describes an HTML element with:
- "tag": the HTML tag name (for example "h1", "p", "img").
- "content": optional string with the text content or primary value for the element.
- "attributes": optional object of HTML attributes (for example {"src": "...", "alt": "..."}).
Do not include explanations or Markdown fences.`;

export const DEFAULT_STRUCTURED_RESPONSE_SCHEMA: AiSchemaRequest = {
    type: AiSchemaType.ARRAY,
    items: {
        type: AiSchemaType.OBJECT,
        properties: {
            tag: {
                type: AiSchemaType.STRING,
                description: 'HTML tag name such as h1, p, button, img.'
            },
            content: {
                type: AiSchemaType.STRING,
                nullable: true,
                description: 'Primary text content or value for the element.'
            },
            attributes: {
                type: AiSchemaType.OBJECT,
                nullable: true,
                properties: createAttributePropertyMap(DEFAULT_ATTRIBUTES)
            },
            children: {
                type: AiSchemaType.ARRAY,
                nullable: true,
                items: {
                    type: AiSchemaType.OBJECT,
                    properties: {
                        tag: {type: AiSchemaType.STRING},
                        content: {type: AiSchemaType.STRING, nullable: true},
                        attributes: {
                            type: AiSchemaType.OBJECT,
                            nullable: true,
                            properties: createAttributePropertyMap(DEFAULT_ATTRIBUTES)
                        }
                    },
                    required: ['tag']
                }
            }
        },
        required: ['tag']
    }
};

export function createStructuredResponseConfig(
    layout?: StructuredLayoutDefinition[] | null
): StructuredGenerationConfig {
    return {
        responseMimeType: 'application/json',
        responseSchema: layout && layout.length
            ? createStructuredResponseSchema(layout)
            : DEFAULT_STRUCTURED_RESPONSE_SCHEMA
    };
}

export function prepareStructuredPrompt(
    basePrompt: string,
    layout?: StructuredLayoutDefinition[] | null
): string {
    const instructions = layout && layout.length ? buildLayoutInstructions(layout) : null;
    const layoutSection = instructions ? `\n\n${instructions}` : '';
    return `${basePrompt}${layoutSection}${STRUCTURED_PROMPT_SUFFIX}`;
}

function createStructuredResponseSchema(layout: StructuredLayoutDefinition[]) {
    const tags = Array.from(collectTags(layout));
    const attributes = Array.from(new Set<string>(collectAttributes(layout)));

    const baseSchema = cloneSchema(DEFAULT_STRUCTURED_RESPONSE_SCHEMA) as AiSchemaRequest;
    const rootItemSchema = baseSchema.items as AiSchemaRequest;
    const rootProperties = (rootItemSchema.properties ?? {}) as Record<string, AiSchemaRequest>;

    if (tags.length && rootProperties['tag']) {
        rootProperties['tag'].enum = tags;
    }

    if (attributes.length) {
        const attributeTargets = [
            extractAttributeProperties(rootItemSchema),
            extractAttributeProperties(rootProperties['children']?.items as AiSchemaRequest | undefined)
        ].filter(Boolean) as Array<Record<string, AiSchemaRequest>>;

        for (const propertyMap of attributeTargets) {
            for (const attribute of attributes) {
                const normalized = attribute === 'aria-label' ? 'ariaLabel' : attribute;
                if (!propertyMap[normalized]) {
                    propertyMap[normalized] = {
                        type: AiSchemaType.STRING,
                        nullable: true
                    };
                }
            }
        }
    }

    return baseSchema;
}

function createAttributePropertyMap(attributes: readonly string[]): Record<string, AiSchemaRequest> {
    const map: Record<string, AiSchemaRequest> = {};
    for (const attribute of attributes) {
        const normalized = attribute === 'aria-label' ? 'ariaLabel' : attribute;
        map[normalized] = {
            type: AiSchemaType.STRING,
            nullable: true
        };
    }
    return map;
}

function extractAttributeProperties(schema?: AiSchemaRequest): Record<string, AiSchemaRequest> | undefined {
    if (!schema || schema.type !== AiSchemaType.OBJECT) {
        return undefined;
    }
    const properties = schema.properties as Record<string, AiSchemaRequest> | undefined;
    const attributesSchema = properties?.['attributes'];
    if (!attributesSchema || attributesSchema.type !== AiSchemaType.OBJECT) {
        return undefined;
    }
    return attributesSchema.properties as Record<string, AiSchemaRequest> | undefined;
}

function collectTags(layout: StructuredLayoutDefinition[]): Set<string> {
    const tags = new Set<string>();
    for (const item of layout) {
        const node = normalizeLayoutNode(item);
        if (node.tag) {
            tags.add(node.tag);
        }
        if (node.children?.length) {
            for (const child of collectTags(node.children)) {
                tags.add(child);
            }
        }
    }
    return tags;
}

function collectAttributes(layout: StructuredLayoutDefinition[]): Set<string> {
    const attributes = new Set<string>();
    for (const item of layout) {
        const node = normalizeLayoutNode(item);
        if (node.attributes) {
            for (const attribute of node.attributes) {
                if (attribute) {
                    attributes.add(attribute);
                }
            }
        }
        if (node.children?.length) {
            for (const attribute of collectAttributes(node.children)) {
                attributes.add(attribute);
            }
        }
    }
    return attributes;
}

function buildLayoutInstructions(layout: StructuredLayoutDefinition[]): string {
    const lines = layout.flatMap((item, index) => describeNode(item, index + 1, 0));
    return `Match the following HTML structure (respect the order and include each required element):\n${lines.join('\n')}`;
}

function describeNode(
    item: StructuredLayoutDefinition,
    index: number,
    depth: number
): string[] {
    const node = normalizeLayoutNode(item);
    const prefix = `${'  '.repeat(depth)}${depth === 0 ? `${index}.` : '-'} `;
    const requirement = node.required === false ? '(optional)' : '(required)';
    const label = node.label ? ` ${node.label}` : '';
    const parts = [`${prefix}<${node.tag}> ${requirement}${label}`];

    if (node.attributes?.length) {
        parts.push(`${'  '.repeat(depth + 1)}Use attributes: ${node.attributes.join(', ')}`);
    }

    if (node.children?.length) {
        node.children.forEach((child, childIndex) => {
            parts.push(...describeNode(child, childIndex + 1, depth + 1));
        });
    }

    return parts;
}

function normalizeLayoutNode(item: StructuredLayoutDefinition): StructuredLayoutNode {
    if (typeof item === 'string') {
        return {tag: item.trim()};
    }
    const tag = typeof item.tag === 'string' ? item.tag.trim() : '';
    return {
        ...item,
        tag
    };
}

function cloneSchema<T>(schema: T): T {
    return JSON.parse(JSON.stringify(schema)) as T;
}
