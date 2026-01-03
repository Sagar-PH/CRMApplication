import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../auth.service';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';


@Injectable({ providedIn: 'root' })
export class AccountRedirectGuard {

    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    canActivate() {
        return this.authService.auth_observer.pipe(
            filter(v => v !== null), take(1),
            map(isLoggedIn =>
                isLoggedIn? this.router.createUrlTree(['/dashboard']): true
            )
        );
    }
}
