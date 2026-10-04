import { Injectable } from '@angular/core';

/**
 * Utilidades de presentación: moneda, fechas e iniciales.
 *
 * Centraliza el `Intl` para que las secciones no repitan la configuración de
 * formato ni las conversiones de fecha que espera el backend.
 */
@Injectable({ providedIn: 'root' })
export class FormattingService {
  /** Formatea un número como moneda. */
  formatCurrency(valor: number | string | null | undefined): string {
    const numero = Number(valor) || 0;

    try {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
      }).format(numero);
    } catch {
      return `$${numero}`;
    }
  }

  /** Formatea una fecha ISO como fecha y hora legible. */
  formatDateTime(fecha: string | null | undefined): string {
    if (!fecha) {
      return '';
    }

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) {
      return fecha;
    }

    try {
      return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return fecha;
    }
  }

  /** Primera letra en mayúscula, para avatares. */
  initial(nombre: string | null | undefined): string {
    return nombre?.trim().charAt(0).toUpperCase() || '?';
  }

  /** Recorta un texto agregando puntos suspensivos. */
  truncate(texto: string, longitud: number): string {
    return texto.length <= longitud ? texto : `${texto.slice(0, longitud)}…`;
  }

  /** Fecha de hoy en `YYYY-MM-DD`, el formato que espera el backend. */
  today(): string {
    return this.toISODate(new Date());
  }

  /** `YYYY-MM-DD` a partir de un `Date`. */
  toISODate(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  /** Fecha y hora local en `YYYY-MM-DDTHH:mm`, el formato de `<input type="datetime-local">`. */
  toISODateTime(fecha: Date): string {
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');

    return `${this.toISODate(fecha)}T${horas}:${minutos}`;
  }

  /** Ahora mismo en `YYYY-MM-DDTHH:mm`. */
  nowDateTime(): string {
    return this.toISODateTime(new Date());
  }

  /** Primer día del mes actual, útil como valor inicial de un rango de fechas. */
  startOfCurrentMonth(): string {
    const hoy = new Date();

    return this.toISODate(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  }
}