import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { routes as containerRoutes} from './container/container.routes';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    ...containerRoutes,
    // { path: '**', redirectTo: ''}, // TODO: redirect to a 404 page or similar
];
