import { Routes, CanActivateFn, Router } from '@angular/router';
import { ContainerComponent } from './container.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { SitePageComponent } from '../site-page/site-page.component';
import { inject } from '@angular/core';
import { AssetCardComponent } from '../asset-card/asset-card.component';
import { OpnamePageComponent } from '../opname-page/opname-page.component';

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
            { path: 'site/:id', component: SitePageComponent, canActivate: [authGuard] },
            { path: 'site/:id/opname', component: OpnamePageComponent, canActivate: [authGuard]}
        ]
    }
];
