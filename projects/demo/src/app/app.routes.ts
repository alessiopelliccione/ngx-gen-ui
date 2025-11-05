import {Routes} from '@angular/router';

import {HomePageComponent} from './pages/home/home-page.component';
import {RecipeProfilesPageComponent} from './pages/recipe-profiles/recipe-profiles-page.component';
import {CreativeShowcasePageComponent} from './pages/creative-showcase/creative-showcase-page.component';
import {Directive} from "@angular/core";

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
        path: 'creative-showcase',
        component: CreativeShowcasePageComponent
    },
    {
        path: '**',
        redirectTo: ''
    }
];
