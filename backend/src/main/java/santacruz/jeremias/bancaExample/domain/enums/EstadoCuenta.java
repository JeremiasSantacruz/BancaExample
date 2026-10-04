package santacruz.jeremias.bancaExample.domain.enums;

import java.util.Locale;

public enum EstadoCuenta {
    ACTIVA,
    BLOQUEADA,
    INACTIVA,
    CERRADA;

    public static EstadoCuenta from(String estado) {
        if (estado == null || estado.isBlank()) {
            throw new IllegalArgumentException("El estado de la cuenta es obligatorio.");
        }
        try {
            return valueOf(estado.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Estado de cuenta no válido: " + estado, exception);
        }
    }

    public boolean esOperativa() {
        return this == ACTIVA;
    }
}
