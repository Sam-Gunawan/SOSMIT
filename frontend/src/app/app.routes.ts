import { Routes, CanActivateFn, Router } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ContainerComponent } from './container/container.component';
import { inject } from '@angular/core';
import { routes as containerRoutes} from './container/container.routes';

const authGuard: CanActivateFn = () => {
    const token = localStorage.getItem('auth_token');
    const router = inject(Router);
    if (token) {
        return true;
    } else {
        router.navigate(['/login']);
        return false;
    }
};

export const routes: Routes = [
    { path: '', canActivate: [authGuard], component: DashboardComponent },
    { path: 'dashboard', redirectTo: '', component: DashboardComponent },
    { path: 'login', component: LoginComponent },
    { path: '**', redirectTo: ''} // TODO: redirect to a 404 page or similar
    { path: 'container', component: ContainerComponent},
    ...containerRoutes,
];
