package santacruz.jeremias.bancaExample.application.usecase;

import java.util.Locale;

final class FiltrosBusqueda {
    public FiltrosBusqueda() {}

    static String texto(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    static String id(String value) {
        String id = texto(value);
        if (id != null) {
            try {
                if (Long.parseLong(id) <= 0) throw new NumberFormatException();
            } catch (NumberFormatException exception) {
                throw new IllegalArgumentException("El ID debe ser un entero positivo.");
            }
        }
        return id;
    }

    static <E extends Enum<E>> String enumerado(String value, Class<E> type) {
        String text = texto(value);
        if (text == null) return null;
        return Enum.valueOf(type, text.toUpperCase(Locale.ROOT)).name();
    }
}
