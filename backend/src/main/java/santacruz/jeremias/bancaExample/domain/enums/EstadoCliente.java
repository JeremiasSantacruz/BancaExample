package santacruz.jeremias.bancaExample.domain.enums;

import java.util.Locale;

public enum EstadoCliente {
    ACTIVO,
    BLOQUEADO,
    INACTIVO,
    CERRADO;

    public static EstadoCliente from(String estado) {
        if (estado == null || estado.isBlank()) {
            throw new IllegalArgumentException("El estado del cliente es obligatorio.");
        }
        try {
            String normalized = estado.trim().toUpperCase(Locale.ROOT);
            return "ACTIVVO".equals(normalized) ? ACTIVO : valueOf(normalized);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Estado de cliente no válido: " + estado, exception);
        }
    }

    public boolean esOperativo() {
        return this == ACTIVO;
    }
}
