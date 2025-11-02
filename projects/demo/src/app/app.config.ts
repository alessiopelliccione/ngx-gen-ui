import {
  ApplicationConfig,
  provideZonelessChangeDetection
} from '@angular/core';

import { provideAiPromptConfig } from 'ngx-gen-ui';

import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAiPromptConfig({
      firebaseOptions: environment.firebase,
      model: environment.firebaseVertexModel
    })
  ]
};
