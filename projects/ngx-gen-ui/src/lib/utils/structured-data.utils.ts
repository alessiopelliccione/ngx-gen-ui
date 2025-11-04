import {Renderer2} from '@angular/core';

const STRUCTURED_PROMPT_SUFFIX = `

Return only a valid JSON array of HTML elements. Each element must be an array where the first value is the tag name (for example "h1") and the second value is the main content or attribute (for example "Title" or "image.jpg" for images). For image tags you may add a third value with the alternative text. Do not include extra text, descriptions, or backticks.`;

export function prepareStructuredPrompt(basePrompt: string): string {
    return `${basePrompt}${STRUCTURED_PROMPT_SUFFIX}`;
}

export function renderStructuredData(
    renderer: Renderer2,
    container: HTMLElement,
    rawContent: string,
    allowHtml: boolean
): void {
    clearContainer(renderer, container);

    if (!rawContent.trim()) {
        return;
    }

    const parsed = parseStructuredContent(rawContent);
    if (!parsed) {
        console.warn(
            'AI response could not be parsed as structured data; falling back to plain text rendering.'
        );
        renderFallback(renderer, container, rawContent, allowHtml);
        return;
    }

    for (const entry of parsed) {
        if (!Array.isArray(entry) || entry.length === 0) {
            continue;
        }

        const [tag, value] = entry;
        if (typeof tag !== 'string' || !tag) {
            continue;
        }

        const normalizedTag = tag.toLowerCase();
        const element = renderer.createElement(normalizedTag);
        if (normalizedTag === 'img') {
            applyImageAttributes(renderer, element as HTMLElement, entry);
        } else {
            const textNode = renderer.createText(
                value === undefined || value === null ? '' : String(value)
            );
            renderer.appendChild(element, textNode);
        }

        renderer.appendChild(container, element);
    }
}

function renderFallback(
    renderer: Renderer2,
    container: HTMLElement,
    content: string,
    allowHtml: boolean
): void {
    const property = allowHtml ? 'innerHTML' : 'textContent';
    renderer.setProperty(container, property, content);
}

function applyImageAttributes(
    renderer: Renderer2,
    element: HTMLElement,
    entry: unknown[]
): void {
    const value = entry[1];
    const srcValue = typeof value === 'string' ? value : '';
    if (srcValue) {
        renderer.setAttribute(element, 'src', srcValue);
    }

    const alt = entry[2];
    if (typeof alt === 'string' && alt) {
        renderer.setAttribute(element, 'alt', alt);
    }
}

function clearContainer(renderer: Renderer2, container: HTMLElement): void {
    let child = container.firstChild;
    while (child) {
        const next = child.nextSibling;
        renderer.removeChild(container, child);
        child = next;
    }
}

function parseStructuredContent(content: string): Array<unknown[]> | null {
    const sanitized = stripCodeFences(content.trim());
    try {
        const parsed = JSON.parse(sanitized);
        return Array.isArray(parsed) ? (parsed as Array<unknown[]>) : null;
    } catch {
        const match = sanitized.match(/\[[\s\S]*\]/);
        if (!match) {
            return null;
        }
        try {
            const parsed = JSON.parse(match[0]);
            return Array.isArray(parsed) ? (parsed as Array<unknown[]>) : null;
        } catch {
            return null;
        }
    }
}

function stripCodeFences(value: string): string {
    if (!value.startsWith('```')) {
        return value;
    }

    const fenceRegex = /^```[a-zA-Z0-9]*\s*([\s\S]*?)\s*```$/;
    const match = value.match(fenceRegex);
    return match ? match[1] : value;
}
