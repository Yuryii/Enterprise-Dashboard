import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { delay, filter, map, map as mapOp, take, tap } from 'rxjs/operators';
import { race, timer } from 'rxjs';

import { ColorModeService } from '@coreui/angular';
import { IconSetService } from '@coreui/icons-angular';
import { iconSubset } from './icons/icon-subset';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { ToastModule } from 'primeng/toast';

@Component({
    selector: 'app-root',
    template: `
        <p-toast position="top-right" [life]="4000" />
        <router-outlet />
    `,
    imports: [RouterOutlet, ToastModule]
})
export class AppComponent implements OnInit {
  title = 'SmartDash';

  readonly #destroyRef: DestroyRef = inject(DestroyRef);
  readonly #activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #titleService = inject(Title);
  readonly #oidcSecurityService = inject(OidcSecurityService);

  readonly #colorModeService = inject(ColorModeService);
  readonly #iconSetService = inject(IconSetService);

  constructor() {
    this.#titleService.setTitle(this.title);
    // iconSet singleton
    this.#iconSetService.icons = { ...iconSubset };
    this.#colorModeService.localStorageItemName.set('smartdash-theme-default');
    this.#colorModeService.eventName.set('ColorSchemeChange');
  }

  ngOnInit(): void {
    // Auth check with 5s timeout — prevents hanging if Keycloak is unreachable
    race(
      this.#oidcSecurityService.checkAuth().pipe(take(1)),
      timer(5000).pipe(mapOp(() => null))
    ).pipe(
      takeUntilDestroyed(this.#destroyRef)
    ).subscribe();

    this.#activatedRoute.queryParams
      .pipe(
        delay(1),
        map(params => <string>params['theme']?.match(/^[A-Za-z0-9\s]+/)?.[0]),
        filter(theme => ['dark', 'light', 'auto'].includes(theme)),
        tap(theme => {
          this.#colorModeService.colorMode.set(theme);
        }),
        takeUntilDestroyed(this.#destroyRef)
      )
      .subscribe();
  }
}
