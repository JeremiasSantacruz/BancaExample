package santacruz.jeremias.bancaExample.application.dto;

/**
 * Parámetros de paginación de un listado: `page` y `size`.
 *
 * Los recibe el controlador y viaja hasta el repositorio, así que también
 * valida los valores: un `page` negativo o un `size` fuera de rango se
 * convierten en un 400 en lugar de una consulta rara.
 *
 * `size=all` desactiva el corte y trae todo el resultado en una sola página. Lo
 * usan los listados que alimentan selectores y cálculos globales (por ejemplo
 * los clientes de los formularios de cuenta y movimiento), donde una página
 * parcial daría un resultado incorrecto.
 */
public record Paginacion(int page, int size, boolean todos) {

    public static final int PAGINA_POR_DEFECTO = 0;
    public static final int TAMANIO_POR_DEFECTO = 10;
    public static final int TAMANIO_MAXIMO = 100;
    public static final String SIN_LIMITE = "all";

    public Paginacion {
        if (page < 0) {
            throw new IllegalArgumentException("La página no puede ser negativa.");
        }
        if (!todos && (size < 1 || size > TAMANIO_MAXIMO)) {
            throw new IllegalArgumentException(
                    "El tamaño de página debe estar entre 1 y " + TAMANIO_MAXIMO + ".");
        }
    }

    /**
     * Traduce los query params. Un `size` ausente usa el tamaño por defecto y
     * `size=all` (en cualquier caja) trae todo el resultado.
     */
    public static Paginacion of(Integer page, String size) {
        int pagina = page == null ? PAGINA_POR_DEFECTO : page;
        String tamano = size == null || size.isBlank() ? String.valueOf(TAMANIO_POR_DEFECTO) : size.trim();

        if (SIN_LIMITE.equalsIgnoreCase(tamano)) {
            return new Paginacion(PAGINA_POR_DEFECTO, TAMANIO_POR_DEFECTO, true);
        }

        return new Paginacion(pagina, toTamano(tamano), false);
    }

    /** Paginación de la primera página con el tamaño por defecto. */
    public static Paginacion porDefecto() {
        return new Paginacion(PAGINA_POR_DEFECTO, TAMANIO_POR_DEFECTO, false);
    }

    private static int toTamano(String tamano) {
        try {
            return Integer.parseInt(tamano);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(
                    "El tamaño de página debe ser un número entre 1 y " + TAMANIO_MAXIMO + ".");
        }
    }
}
