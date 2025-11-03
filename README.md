<h1 align="center">
  <img src="docs/cover/cover.png" alt="ngx-gen-ui cover" width="300">
</h1>

## ngx-gen-ui Monorepo

This repository contains:

- `projects/ngx-gen-ui`: the publishable Angular library exposing an `AiPromptDirective` and `AiService` that stream content from Firebase Vertex AI.
- `projects/demo`: a showcase application that consumes the library and demonstrates several prompt scenarios.

---

## Using the Library in Your Project

### 1. Install

```bash
npm install ngx-gen-ui firebase @firebase/vertexai-preview
```

`firebase` and `@firebase/vertexai-preview` are peer dependencies used internally by the service.

### 2. Provide Firebase + Vertex AI credentials

```ts
// app.config.ts (Angular 17+ standalone bootstrap)
import { ApplicationConfig, provideHttpClient } from '@angular/core';
import { provideAiPromptConfig } from 'ngx-gen-ui';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideAiPromptConfig({
      firebaseOptions: {
        apiKey: 'YOUR_API_KEY',
        projectId: 'YOUR_PROJECT_ID',
        appId: 'YOUR_APP_ID',
        authDomain: 'YOUR_AUTH_DOMAIN'
      },
      model: 'gemini-2.0-flash' // optional, defaults to gemini-1.5-flash
    })
  ]
};
```

> Replace the Firebase options with the credentials for the project that has Vertex AI access.

### 3. Apply the directive in a template

```html
<p
  ai-prompt="Write a friendly welcome description for our SaaS homepage."
  [ai-generation]="{ temperature: 0.4 }"
  ai-stream
></p>
```

Supported bindings:

- `ai-prompt` / `aiPrompt`: prompt string.
- `[ai-generation]` / `[aiGeneration]`: partial `GenerationConfig` (temperature, model, etc.).
- `ai-stream` / `aiStream`: enable streaming updates.
- `ai-allow-html` / `aiAllowHtml`: render streamed HTML safely when you trust the source.

The directive automatically cancels in-flight requests when the prompt or config changes.

---

## Working with this Repo

### Prerequisites

- Node.js 18+
- npm
- Firebase project with Vertex AI access (for the demo)

### Install dependencies

```bash
npm install
```

### Run the demo app

```bash
npm start
# -> http://localhost:4200
```

Update `projects/demo/src/environments/environment.ts` with your Firebase credentials before streaming real data.

### Build the demo

```bash
npm run build
# output: dist/demo
```

### Build the library

```bash
npm run build:lib
# output: dist/ngx-gen-ui
```

### Publish the library

```bash
cd dist/ngx-gen-ui
npm publish --access public
```

---

## License

MIT © Alessio Pelliccione
