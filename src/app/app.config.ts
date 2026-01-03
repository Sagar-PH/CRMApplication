import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { AuthService } from './auth.service';

export function authInitializer(authService: AuthService) {
  return () => authService.initAuth();
}

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes), provideClientHydration(withEventReplay()),
  provideAppInitializer(() => {
    const authService = inject(AuthService);
    return authService.initAuth();
  })]
};
