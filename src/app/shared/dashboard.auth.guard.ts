import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../auth.service';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DashboardAuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) { }

  canActivate() {
    return this.authService.auth_observer.pipe(
      filter(v => v !== null), take(1),
      map(isLoggedIn => {
        if (!isLoggedIn && !this.authService.getLoadingState()) {
          return this.router.createUrlTree(['/login']);
        }
        return true;
      })
    );
  }
}