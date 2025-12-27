import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

const routes: Routes = [
    {
        path: 'create',
        loadComponent: () =>
            import('./create/create.component')
                .then(m => m.CreateComponent)
    },
    {
        path: 'view',
        loadComponent: () =>
            import('./view/view.component')
                .then(m => m.ViewComponent)
    },
    {
        path: 'edit/:id',
        loadComponent: () =>
            import('./edit/edit.component')
                .then(m => m.EditComponent)
    }
]

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class TasksRoutingModule { }