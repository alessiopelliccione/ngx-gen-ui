<p align="center">
  <img src="cover.png" alt="ngx-gen-ui cover" width="300">
</p>

<h1 align="center">ngx-gen-ui</h1>

<p align="center">
  Stream AI responses straight into Angular templates – Firebase adapter included by default.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ngx-gen-ui" target="_blank">
    <img src="https://img.shields.io/npm/v/ngx-gen-ui.svg" alt="npm package" />
  </a>
  <br/>
  <a href="https://angular.dev/" target="_blank"><strong>Angular</strong></a> ·
  <a href="https://firebase.google.com/products/vertex-ai" target="_blank"><strong>Firebase Vertex AI adapter</strong></a>
</p>

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

This monorepo ships two projects:

- `projects/ngx-gen-ui`: a publishable Angular library exposing `AiPromptDirective`, `AiStructuredPromptDirective`, and the reusable `PromptEngineService`. The core is provider-agnostic and ships with a Firebase adapter.
- `projects/demo`: a showcase app demonstrating different prompt scenarios using the library.

The library focuses on lightweight integration and reactive streaming, making it simple to drop AI-powered text into any Angular view.

---

## Features

- **Streamlined setup** — Add a directive, pass a prompt, watch content stream in real time.
- **Configurable generation** — Tweak models, temperature, and more via `AiGenerationConfig`.
- **Adapter friendly** — Implement `AiAdapter` to hook up any AI backend when Firebase is not required.
- **Safe rendering** — Opt-in HTML rendering with guards for trusted content.
- **Structured responses** — Let the AI return schema-validated markup (for example `{ "tag": "h1", "content": "Title" }`) and render it instantly.
- **Layout guides** — Describe the element structure in TypeScript and let the directive enforce it via dynamic JSON schemas.
- **Reusable prompt engine** — Share the same prompt execution logic across directives or invoke it directly from your own services.
- **Angular-first DX** — Works with standalone APIs and cancellation built in.

---

## Quick Start

### 1. Install dependencies

```bash
npm install ngx-gen-ui firebase @firebase/ai
```

> `firebase` and `@firebase/ai` are only needed when you opt into the Firebase adapter shipped with the library. Custom adapters can drop those peer dependencies entirely.

### 2. Provide Firebase + Vertex AI credentials

```ts
// app.config.ts (Angular 17+ standalone bootstrap)
import { ApplicationConfig, provideHttpClient } from '@angular/core';
import { provideFirebaseAiAdapter } from 'ngx-gen-ui';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    ...provideFirebaseAiAdapter({
      firebaseOptions: {
        apiKey: 'YOUR_API_KEY',
        projectId: 'YOUR_PROJECT_ID',
        appId: 'YOUR_APP_ID',
        authDomain: 'YOUR_AUTH_DOMAIN'
      },
      model: 'gemini-2.5-flash-lite', // optional, defaults to gemini-2.5-flash-lite
      location: 'us-central1', // optional, defaults to us-central1
      defaultGenerationConfig: {
        temperature: 0 // applied unless overridden per request
      }
    })
  ]
};
```

### 3. Apply the directive

```ts
// app.component.ts
import { Component } from '@angular/core';
import { AiPromptDirective, AiStructuredPromptDirective } from 'ngx-gen-ui';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AiPromptDirective, AiStructuredPromptDirective],
  templateUrl: './app.component.html'
})
export class AppComponent {}
```

```html
<!-- app.component.html -->
<p
  ai-prompt="Write a friendly welcome description for our SaaS homepage."
  [ai-generation]="{ temperature: 0.4 }"
  ai-stream
></p>
```

### 4. Generate structured UI fragments (optional)

Use the dedicated directive when you want the AI to respond with lightweight HTML instructions that the library renders for you.

```html
<div
  class="hero-preview"
  ai-structured-prompt="Design a short hero section for an Italian tech startup with a title, supporting sentence, and an image URL."
></div>
```

> The `ai-structured-prompt` directive automatically asks the AI for a JSON array like:
>
> ```json
> [
>   { "tag": "h1", "content": "Hero headline" },
>   { "tag": "p", "content": "Supporting copy in one short sentence." },
>   { "tag": "img", "attributes": { "src": "https://example.com/hero.jpg", "alt": "Hero illustration" } }
> ]
> ```
>
> The library requests the response in `application/json` using a response schema to ensure the payload is always valid. Streaming is disabled in this mode to guarantee the JSON contract.

**Supported bindings**

- `ai-prompt` / `aiPrompt`: prompt string.
- `[ai-generation]` / `[aiGeneration]`: partial generation config (temperature, topK, etc.).
- `ai-stream` / `aiStream`: enable streaming updates.

**Structured directive bindings**

- `ai-structured-prompt` / `aiStructuredPrompt`: prompt string.
- `[ai-structured-generation]` / `[aiStructuredGeneration]`: partial generation config.
- `[ai-structured-layout]` / `[aiStructuredLayout]`: optional TypeScript structure that the model must follow (converted into a JSON schema + prompt instructions).

### 5. (Optional) Define a custom layout

```ts
// layouts.ts
import { StructuredLayoutDefinition } from 'ngx-gen-ui';

export const heroLayout: StructuredLayoutDefinition[] = [
  { tag: 'h1', label: 'Hero headline' },
  { tag: 'h2', label: 'Hero sub-headline', required: false },
  { tag: 'h3', label: 'CTA label' },
  { tag: 'p', label: 'Supporting copy' }
];

export const featureLayout: StructuredLayoutDefinition[] = [
  { tag: 'h2', label: 'Section title' },
  {
    tag: 'div',
    label: 'Feature list',
    children: [
      {
        tag: 'article',
        label: 'Feature card',
        children: [
          { tag: 'h3', label: 'Feature name' },
          { tag: 'p', label: 'Feature description' }
        ]
      },
      {
        tag: 'article',
        label: 'Optional feature card',
        required: false,
        children: [
          { tag: 'h3', label: 'Feature name' },
          { tag: 'p', label: 'Feature description' }
        ]
      }
    ]
  }
];
```

```html
<!-- app.component.html -->
<section
  ai-structured-prompt="Design a hero for an Italian tech startup with a strong CTA."
  [ai-structured-layout]="heroLayout"
></section>

<section
  ai-structured-prompt="Describe two killer capabilities of our AI analytics assistant."
  [ai-structured-layout]="featureLayout"
></section>
```

The directive converts your layout definitions into:

- A stricter `responseSchema` (only the tags/attributes you list are allowed).
- Prompt instructions that tell Gemini which elements must appear and in what order.

### 6. Advanced usage (optional)

Need more control? Inject the `PromptEngineService` to run prompts directly in your own services or components. It exposes the same helpers used by the directives, including response schemas for structured prompts:

```ts
import { inject } from '@angular/core';
import { PromptEngineService } from 'ngx-gen-ui';

const engine = inject(PromptEngineService);
const result = await engine.generatePrompt({ prompt: 'Summarise this release note.' });
```

### Custom adapters

The core package no longer depends on Firebase. You can wire any AI provider by implementing the `AiAdapter` interface and supplying it through the `AI_ADAPTER` injection token:

```ts
import { AI_ADAPTER, AiAdapter, AiGenerationConfig } from 'ngx-gen-ui';

const myProviderClient = createProviderClient(); // your integration entry point

class CustomAiAdapter implements AiAdapter {
  async sendPrompt(prompt: string, config?: Partial<AiGenerationConfig> | null): Promise<string> {
    // Call your provider SDK and return the generated text
    return await myProviderClient.generate(prompt, config ?? undefined);
  }

  async streamPrompt(prompt: string, config?: Partial<AiGenerationConfig> | null) {
    // Return an async iterator of strings plus a final response promise
    return {
      stream: myProviderClient.stream(prompt, config ?? undefined),
      finalResponse: myProviderClient.final(prompt, config ?? undefined)
    };
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: AI_ADAPTER, useClass: CustomAiAdapter }
  ]
});
```

Use `provideAiPromptConfig({ defaultGenerationConfig: { temperature: 0.2 } })` if you want to define app-wide defaults that every adapter can honour.

---

## Development

### Prerequisites
- Node.js 18+
- npm
- Firebase project with Vertex AI access (for the demo)

### Common scripts

```bash
npm install      # install dependencies
npm start        # run the demo app -> http://localhost:4200
npm run build    # build the demo app (dist/demo)
npm run build:lib  # build the library (dist/ngx-gen-ui)
```

> Update `projects/demo/src/environments/environment.ts` with your Firebase credentials before streaming real data.

---

## Contributing

Planning to collaborate? Read the lightweight guide in [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

MIT © Alessio Pelliccione
