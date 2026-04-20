import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { first, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return authService.accessToken$.pipe(
    first((token) => token !== null && token !== undefined),
    switchMap((token) => {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
      return next(authReq);
    })
  );
};
