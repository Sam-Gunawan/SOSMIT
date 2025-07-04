import { Routes, CanActivateFn, Router } from '@angular/router';
import { ContainerComponent } from './container.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { SitePageComponent } from '../site-page/site-page.component';
import { inject } from '@angular/core';
import { AssetPageComponent } from '../asset-page/asset-page.component';

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
    {
        path: '', component: ContainerComponent,
        children: [
            { path: '', canActivate: [authGuard], component: DashboardComponent, pathMatch: 'full' },
            { path: 'site/:id', component: SitePageComponent },
            { path: 'asset/:tag', component: AssetPageComponent}
        ]
    }
];
