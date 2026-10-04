import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // Los query params de la URL llegan como inputs de cada sección, así
      // `/cuentas?clienteId=7` abre la tabla ya filtrada.
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    // En desarrollo las rutas relativas `/clientes` etc. las resuelve el proxy
    // de `proxy.conf.json` contra `http://localhost:8080`.
    provideHttpClient(withInterceptorsFromDi()),
  ],
};