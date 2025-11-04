import {
    StructuredGenerationConfig,
    StructuredLayoutDefinition,
    StructuredLayoutNode
} from './structured-types';

const DEFAULT_ATTRIBUTES = [
    'src',
    'alt',
    'href',
    'target',
    'rel',
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

export const DEFAULT_STRUCTURED_RESPONSE_SCHEMA = {
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
                properties: Object.fromEntries(
                    DEFAULT_ATTRIBUTES.map((attribute) => [attribute, {type: 'string', nullable: true}])
                )
            },
            children: {
                type: 'array',
                nullable: true,
                items: {
                    type: 'object',
                    properties: {
                        tag: {type: 'string'},
                        content: {type: 'string', nullable: true},
                        attributes: {
                            type: 'object',
                            nullable: true,
                            properties: Object.fromEntries(
                                DEFAULT_ATTRIBUTES.map((attribute) => [attribute, {type: 'string', nullable: true}])
                            )
                        }
                    },
                    required: ['tag']
                }
            }
        },
        required: ['tag']
    }
} as const;

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

    const baseSchema = cloneSchema(DEFAULT_STRUCTURED_RESPONSE_SCHEMA) as {
        items: {
            properties: {
                tag: Record<string, unknown>;
                attributes: {properties: Record<string, {type: string; nullable: boolean}>};
                children?: {
                    items?: {
                        properties: {
                            tag: Record<string, unknown>;
                            attributes?: {properties: Record<string, {type: string; nullable: boolean}>};
                        };
                    };
                };
            };
        };
    };

    if (tags.length) {
        (baseSchema.items.properties.tag as Record<string, unknown>)['enum'] = tags;
    }

    if (attributes.length) {
        const attributeTargets = [
            baseSchema.items.properties.attributes.properties,
            baseSchema.items.properties.children?.items?.properties?.attributes?.properties
        ].filter(Boolean) as Array<Record<string, {type: string; nullable: boolean}>>;

        for (const propertyMap of attributeTargets) {
            for (const attribute of attributes) {
                const normalized = attribute === 'aria-label' ? 'ariaLabel' : attribute;
                propertyMap[normalized] = {type: 'string', nullable: true};
            }
        }
    }

    return baseSchema;
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
