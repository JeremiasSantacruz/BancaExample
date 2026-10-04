package santacruz.jeremias.bancaExample.domain.enums;

public enum TipoMovimiento {
    DEPOSITO,
    RETIRO;

    public static TipoMovimiento from(String tipoMovimiento) {
        if (tipoMovimiento == null || tipoMovimiento.isBlank()) {
            throw new IllegalArgumentException("El tipo de movimiento es obligatorio.");
        }
        return switch (tipoMovimiento.trim().toUpperCase(java.util.Locale.ROOT)) {
            case "DEPOSITO", "CREDITO" -> DEPOSITO;
            case "RETIRO", "DEBITO" -> RETIRO;
            default -> throw new IllegalArgumentException("Tipo de movimiento no válido: " + tipoMovimiento);
        };
    }
}
