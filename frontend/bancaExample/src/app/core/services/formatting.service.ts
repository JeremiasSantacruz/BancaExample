import {Injectable} from '@angular/core';

/**
 * Servicio de utilidades para operaciones comunes de formateo y conversión
 * Centraliza la lógica de presentación de datos (Clean Code - Separation of Concerns)
 */
@Injectable({
  providedIn: 'root'
})
export class FormattingService {
  /**
   * Formatea un número como moneda ARS
   */
  formatearMoneda(valor: number): string {
    try {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
      }).format(Number(valor) || 0);
    } catch {
      return `$${valor}`;
    }
  }

  /**
   * Formatea una fecha en formato legible
   */
  formatearFecha(fecha: string): string {
    try {
      const date = new Date(fecha);
      if (Number.isNaN(date.getTime())) {
        return fecha;
      }

      return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch {
      return fecha;
    }
  }

  /**
   * Obtiene la primera letra de un nombre
   */
  obtenerInicial(nombre: string): string {
    return nombre.trim().charAt(0).toUpperCase() || 'U';
  }

  /**
   * Trunca un texto a una longitud máxima
   */
  truncar(texto: string, longitud: number): string {
    if (texto.length <= longitud) {
      return texto;
    }
    return texto.substring(0, longitud) + '…';
  }

  /**
   * Calcula la fecha de hoy en formato YYYY-MM-DD
   */
  obtenerFechaHoy(): string {
    const hoy = new Date();
    return this.formatearFechaISO(hoy);
  }

  /**
   * Formatea una fecha en formato ISO (YYYY-MM-DD)
   */
  formatearFechaISO(fecha: Date): string {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }

  /**
   * Obtiene la fecha y hora actual en formato datetime-local
   */
  obtenerFechaHoraActual(): string {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    return `${año}-${mes}-${dia}T${horas}:${minutos}`;
  }
}

