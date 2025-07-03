import { Routes } from '@angular/router';
import { ContainerComponent } from './container.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { SitePageComponent } from '../site-page/site-page.component';

export const routes: Routes = [
    {
        path:'container', component: ContainerComponent,
        children: [
            { path: 'dashboard', component: DashboardComponent },
            { path: 'site/:id', component: SitePageComponent}
        ]
    }
];
