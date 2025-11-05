import {Routes} from '@angular/router';

import {HomePageComponent} from './pages/home/home-page.component';
import {RecipeProfilesPageComponent} from './pages/recipe-profiles/recipe-profiles-page.component';

export const APP_ROUTES: Routes = [
    {
        path: '',
        component: HomePageComponent
    },
    {
        path: 'recipe-profiles',
        component: RecipeProfilesPageComponent
    },
    {
        path: '**',
        redirectTo: ''
    }
];
