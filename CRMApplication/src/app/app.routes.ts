import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { RegisterComponent } from './register/register.component';
import { DashboardAuthGuard } from './shared/dashboard.auth.guard';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            {
                path: 'dashboard',
                component: DashboardComponent,
                canActivate: [DashboardAuthGuard]
            },
            {
                path: 'salesorder',
                loadChildren: () =>
                    import('./module/salesorder/salesorder.module')
                        .then(m => m.SalesOrderModule)
            },
            {
                path: 'purchaseorder',
                loadChildren: () =>
                    import('./module/purchaseorder/purchaseorder.module')
                        .then(m => m.PurchaseOrderModule)
            },
            {
                path: 'vendors',
                loadChildren: () =>
                    import('./module/vendors/vendors.module')
                        .then(m => m.VendorsModule)
            },
            {
                path: 'contacts',
                loadChildren: () =>
                    import('./module/contacts/contacts.module')
                        .then(m => m.ContactsModule)
            },
            {
                path: 'tasks',
                loadChildren: () =>
                    import('./module/tasks/tasks.module')
                        .then(m => m.TasksModule)
            }
        ]
    }

];
