import {StructuredElement} from './structured-types';

export function parseStructuredContent(content: string): StructuredElement[] | null {
    const sanitized = stripCodeFences(content.trim());
    let parsed: unknown;
    try {
        parsed = JSON.parse(sanitized);
    } catch {
        const match = sanitized.match(/\[[\s\S]*\]/);
        if (!match) {
            return null;
        }
        try {
            parsed = JSON.parse(match[0]);
        } catch {
            return null;
        }
    }

    if (!Array.isArray(parsed)) {
        return null;
    }

    const elements: StructuredElement[] = [];
    for (const entry of parsed) {
        const normalized = normalizeEntry(entry);
        if (normalized) {
            elements.push(normalized);
        }
    }

    return elements.length ? elements : null;
}

function normalizeEntry(entry: unknown): StructuredElement | null {
    if (Array.isArray(entry)) {
        return normalizeTupleEntry(entry);
    }

    if (!entry || typeof entry !== 'object') {
        return null;
    }

    return normalizeObjectEntry(entry as Record<string, unknown>);
}

function normalizeTupleEntry(entry: unknown[]): StructuredElement | null {
    if (entry.length === 0) {
        return null;
    }

    const [tag, value, alt] = entry;
    if (typeof tag !== 'string' || !tag.trim()) {
        return null;
    }

    const tagName = tag.trim();
    const lowerTag = tagName.toLowerCase();
    const attributes: Record<string, string> = {};
    let content: string | null = null;

    if (typeof value === 'string' && value.trim()) {
        if (lowerTag === 'img') {
            attributes['src'] = value.trim();
        } else {
            content = value;
        }
    }

    if (typeof alt === 'string' && alt.trim()) {
        attributes['alt'] = alt.trim();
    }

    return {
        tag: tagName,
        content,
        attributes,
        children: []
    };
}

function normalizeObjectEntry(entry: Record<string, unknown>): StructuredElement | null {
    const tagCandidate = readString(entry, 'tag') ?? readString(entry, 'element');
    if (!tagCandidate) {
        return null;
    }

    const tagName = tagCandidate;
    const lowerTag = tagName.toLowerCase();
    const attributes = extractAttributes(entry);

    let content = firstString(
        entry['content'],
        entry['text'],
        entry['copy'],
        entry['value'],
        entry['description']
    );

    if (lowerTag === 'img') {
        const src = readString(entry, 'src');
        if (src) {
            attributes['src'] = src;
        }
        const alt = readString(entry, 'alt');
        if (alt) {
            attributes['alt'] = alt;
        }
        if (content && !attributes['src']) {
            attributes['src'] = content;
            content = null;
        }
    }

    const children = Array.isArray(entry['children'])
        ? (entry['children'] as unknown[])
              .map((child) => normalizeEntry(child))
              .filter((child): child is StructuredElement => Boolean(child))
        : [];

    return {
        tag: tagName,
        content: content ?? null,
        attributes,
        children
    };
}

function extractAttributes(source: Record<string, unknown>): Record<string, string> {
    const attributes: Record<string, string> = {};

    const rawAttributes = source['attributes'];
    if (rawAttributes && typeof rawAttributes === 'object') {
        Object.entries(rawAttributes as Record<string, unknown>).forEach(([key, value]) => {
            const normalized = normalizeAttributeValue(value);
            if (normalized !== null) {
                attributes[normalizeAttributeName(key)] = normalized;
            }
        });
    }

    for (const key of ATTRIBUTE_KEYS) {
        const value = source[key];
        const normalized = normalizeAttributeValue(value);
        if (normalized !== null) {
            const attributeName = normalizeAttributeName(key);
            attributes[attributeName] = normalized;
        }
    }

    return attributes;
}

function normalizeAttributeValue(value: unknown): string | null {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value === 'string') {
        return value.trim();
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return null;
}

function firstString(...candidates: Array<unknown>): string | null {
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate;
        }
    }
    return null;
}

function stripCodeFences(value: string): string {
    if (!value.startsWith('```')) {
        return value;
    }

    const fenceRegex = /^```[a-zA-Z0-9]*\s*([\s\S]*?)\s*```$/;
    const match = value.match(fenceRegex);
    return match ? match[1] : value;
}

function normalizeAttributeName(key: string): string {
    if (key === 'ariaLabel') {
        return 'aria-label';
    }
    return key;
}

function readString(source: Record<string, unknown>, key: string): string | null {
    const value = source[key];
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

const ATTRIBUTE_KEYS = new Set([
    'src',
    'alt',
    'href',
    'target',
    'rel',
    'class',
    'id',
    'role',
    'aria-label',
    'ariaLabel',
    'title'
]);
