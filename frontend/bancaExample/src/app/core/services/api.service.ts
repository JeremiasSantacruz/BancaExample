import {Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpParams} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';

/**
 * Respuesta de error estándar del servidor
 */
interface ErrorResponse {
  message?: string;
  detail?: string;
}

/**
 * Servicio base para manejar la comunicación HTTP con el servidor
 * Implementa DRY (Don't Repeat Yourself) y Error Handling consistente
 *
 * @example
 * this.http.get<Cliente[]>('/clientes')
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private readonly http: HttpClient) {
  }

  /**
   * Realiza una solicitud GET
   */
  get<T>(endpoint: string, filters: Record<string, string> = {}): Observable<T> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value.trim()) params = params.set(key, value.trim());
    }
    return this.http
      .get<T>(endpoint, {params})
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Realiza una solicitud POST
   */
  post<T>(endpoint: string, data: unknown): Observable<T> {
    return this.http.post<T>(endpoint, data).pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Realiza una solicitud PUT
   */
  put<T>(endpoint: string, data: unknown): Observable<T> {
    return this.http.put<T>(endpoint, data).pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Realiza una solicitud DELETE
   */
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(endpoint).pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Maneja errores HTTP de manera consistente
   * Extrae mensajes de error del servidor cuando están disponibles
   */
  private handleError(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      const errorResponse = error.error as ErrorResponse | null;
      const message =
        errorResponse?.message ??
        errorResponse?.detail ??
        error.message ??
        'No se pudo completar la operación.';
      return throwError(() => new Error(message));
    }

    if (error instanceof Error) {
      return throwError(() => error);
    }

    return throwError(() => new Error('No se pudo completar la operación.'));
  }
}
