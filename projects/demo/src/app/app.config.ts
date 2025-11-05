import {
  ApplicationConfig,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideFirebaseAiAdapter } from 'ngx-gen-ui';

import { environment } from '../environments/environment';
import { APP_ROUTES } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(APP_ROUTES),
    ...provideFirebaseAiAdapter({
      firebaseOptions: environment.firebase,
      model: environment.firebaseVertexModel
    })
  ]
};
