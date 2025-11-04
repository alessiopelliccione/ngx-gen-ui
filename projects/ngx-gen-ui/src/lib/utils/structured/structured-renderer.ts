import {Renderer2} from '@angular/core';

import {StructuredElement} from './structured-types';
import {parseStructuredContent} from './structured-parser';

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
        const element = renderElement(renderer, entry, allowHtml);
        if (element) {
            renderer.appendChild(container, element);
        }
    }
}

function renderElement(
    renderer: Renderer2,
    entry: StructuredElement,
    allowHtml: boolean
): HTMLElement | null {
    const tag = entry.tag?.trim();
    if (!tag) {
        return null;
    }

    const normalizedTag = tag.toLowerCase();
    const element = renderer.createElement(normalizedTag);

    const attributes = {...entry.attributes};
    if (normalizedTag === 'img') {
        if (entry.content && !attributes['src']) {
            attributes['src'] = entry.content;
        }
        if (!attributes['alt']) {
            attributes['alt'] = '';
        }
    }

    for (const [key, value] of Object.entries(attributes)) {
        if (value === undefined || value === null) {
            continue;
        }
        const stringValue = String(value);
        const attributeName = key === 'ariaLabel' ? 'aria-label' : key;
        renderer.setAttribute(element, attributeName, stringValue);
    }

    if (entry.children.length > 0) {
        for (const child of entry.children) {
            const childElement = renderElement(renderer, child, allowHtml);
            if (childElement) {
                renderer.appendChild(element, childElement);
            }
        }
    } else if (entry.content && normalizedTag !== 'img') {
        if (allowHtml) {
            renderer.setProperty(element, 'innerHTML', entry.content);
        } else {
            const textNode = renderer.createText(entry.content);
            renderer.appendChild(element, textNode);
        }
    }

    return element;
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

function clearContainer(renderer: Renderer2, container: HTMLElement): void {
    let child = container.firstChild;
    while (child) {
        const next = child.nextSibling;
        renderer.removeChild(container, child);
        child = next;
    }
}
