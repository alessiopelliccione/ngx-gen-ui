import {
  ApplicationConfig,
  provideZonelessChangeDetection
} from '@angular/core';

import { provideFirebaseAiAdapter } from 'ngx-gen-ui';

import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    ...provideFirebaseAiAdapter({
      firebaseOptions: environment.firebase,
      model: environment.firebaseVertexModel
    })
  ]
};
