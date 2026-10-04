import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Forma de los errores que devuelve Spring Boot.
 */
interface BackendError {
  message?: string;
  detail?: string;
}

/**
 * Prefijo de todas las llamadas al backend.
 *
 * El dev server lo reenvía al backend (ver `proxy.conf.json`) y las rutas de la
 * SPA dejan de chocarse con las del backend: recargar con F5 sobre `/cuentas`
 * sirve `index.html` en vez de caer en la API.
 */
const PREFIJO_API = '/api';

/**
 * Base de comunicación HTTP.
 *
 * Centraliza el manejo de errores para que todos los servicios lancen siempre
 * un `Error` con el mensaje del backend, y no un `HttpErrorResponse`.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /**
   * GET. Los filtros vacíos se descartan para no ensuciar la query string.
   *
   * `filtros` es `object` y no `Record<...>` para aceptar las interfaces de
   * filtros tipadas (`ClienteFilters`, `CuentaFilters`, ...) sin agregarles un
   * index signature.
   */
  get<T>(endpoint: string, filtros: object = {}): Observable<T> {
    return this.http
      .get<T>(this.url(endpoint), { params: this.construirParams(filtros) })
      .pipe(catchError((error: unknown) => this.normalizarError(error)));
  }

  post<T>(endpoint: string, cuerpo: unknown): Observable<T> {
    return this.http
      .post<T>(this.url(endpoint), cuerpo)
      .pipe(catchError((error: unknown) => this.normalizarError(error)));
  }

  put<T>(endpoint: string, cuerpo: unknown): Observable<T> {
    return this.http
      .put<T>(this.url(endpoint), cuerpo)
      .pipe(catchError((error: unknown) => this.normalizarError(error)));
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http
      .delete<T>(this.url(endpoint))
      .pipe(catchError((error: unknown) => this.normalizarError(error)));
  }

  private url(endpoint: string): string {
    return `${PREFIJO_API}${endpoint}`;
  }

  /**
   * Traduce el objeto de filtros a query params.
   *
   * Acepta strings (se recortan), números y booleanos: la paginación viaja
   * como `page=0&size=10`, y `size=all` como texto.
   */
  private construirParams(filtros: object): HttpParams {
    let params = new HttpParams();

    for (const [clave, valor] of Object.entries(filtros as Record<string, unknown>)) {
      const limpio = this.normalizarValor(valor);

      if (limpio !== null) {
        params = params.set(clave, limpio);
      }
    }

    return params;
  }

  private normalizarValor(valor: unknown): string | number | boolean | null {
    if (typeof valor === 'string') {
      return valor.trim() ? valor.trim() : null;
    }

    if (typeof valor === 'number') {
      return Number.isFinite(valor) ? valor : null;
    }

    if (typeof valor === 'boolean') {
      return valor;
    }

    return null;
  }

  /**
   * Extrae el mensaje del backend y lo devuelve como `Error`.
   */
  private normalizarError(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      return throwError(() => new Error(this.extraerMensaje(error)));
    }

    if (error instanceof Error) {
      return throwError(() => error);
    }

    return throwError(() => new Error('No se pudo completar la operación.'));
  }

  /**
   * Spring Boot puede responder texto plano o un cuerpo JSON con `message` /
   * `detail`.
   *
   * Si el cuerpo no aporta nada se devuelve el mensaje genérico en lugar del
   * texto crudo de `HttpErrorResponse` ("Http failure response for..."), que no
   * le sirve de nada a quien está usando la aplicación.
   */
  private extraerMensaje(error: HttpErrorResponse): string {
    const cuerpo = error.error;

    if (typeof cuerpo === 'string' && cuerpo.trim()) {
      return cuerpo;
    }

    if (cuerpo && typeof cuerpo === 'object') {
      const detalle = cuerpo as BackendError;

      return detalle.message || detalle.detail || this.mensajePorDefecto();
    }

    return this.mensajePorDefecto();
  }

  private mensajePorDefecto(): string {
    return 'No se pudo completar la operación.';
  }
}