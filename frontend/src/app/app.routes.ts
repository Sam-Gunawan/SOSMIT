import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ContainerComponent } from './container/container.component';
import { routes as containerRoutes} from './container/container.routes';

export const routes: Routes = [
    { path: '', component: LoginComponent },
    { path: 'container', component: ContainerComponent},
    ...containerRoutes,
];
