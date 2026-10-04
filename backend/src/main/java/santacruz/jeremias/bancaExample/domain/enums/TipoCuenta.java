package santacruz.jeremias.bancaExample.domain.enums;

public enum TipoCuenta {
    AHORRO,
    PLAZO_FIJO,
    CORRIENTE;

    public static Boolean isValidTipoCuenta(String tipoCuenta) {
        for (TipoCuenta tipo : TipoCuenta.values()) {
            if (tipo.name().equalsIgnoreCase(tipoCuenta)) {
                return true;
            }
        }
        return false;
    }
}
