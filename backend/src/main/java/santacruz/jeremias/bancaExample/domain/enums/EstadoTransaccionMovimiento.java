package santacruz.jeremias.bancaExample.domain.enums;

import java.util.List;
import java.util.Locale;

public enum EstadoTransaccionMovimiento {
    REVERSED_CORRECTION,
    REVERSED,
    APPROVED,
    REJECTED;

    public static EstadoTransaccionMovimiento from(String estado) {
        if (estado == null || estado.isBlank()) {
            throw new IllegalArgumentException("El estado del movimiento es obligatorio.");
        }
        try {
            return valueOf(estado.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Estado de movimiento no válido: " + estado, exception);
        }
    }

    public static List<EstadoTransaccionMovimiento> getNotReversible() {
        return List.of(REVERSED_CORRECTION, REVERSED, REJECTED);
    }
}
