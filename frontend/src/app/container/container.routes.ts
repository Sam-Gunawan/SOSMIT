import { Routes, CanActivateFn, Router } from '@angular/router';
import { ContainerComponent } from './container.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { SitePageComponent } from '../site-page/site-page.component';
import { inject } from '@angular/core';
import { OpnamePageComponent } from '../opname-page/opname-page.component';
import { SearchPageComponent } from '../search-page/search-page.component';
import { ReportComponent } from '../report/report.component';
import { OpnameReviewPageComponent } from '../opname-review-page/opname-review-page.component';

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
            { path: '', component: DashboardComponent, canActivate: [authGuard], pathMatch: 'full' },
            { path: 'search', component: SearchPageComponent, canActivate: [authGuard] },
            { path: 'location', component: SitePageComponent, canActivate: [authGuard] },
            { path: 'location/opname', component: OpnamePageComponent, canActivate: [authGuard] },
            { path: 'location/report', component: ReportComponent, canActivate: [authGuard] },
        ]
    },
    { path: 'opname/:session-id/review', component: OpnameReviewPageComponent, canActivate: [authGuard] }
];
