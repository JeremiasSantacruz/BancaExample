package santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ClienteRequest(
        @NotNull(message = "es obligatoria.") String contrasena,
        @NotNull(message = "es obligatorio.") String estado,
        @NotNull(message = "es obligatorio.") String nombre,
        @NotNull(message = "es obligatorio.") String genero,
        @NotNull(message = "es obligatoria.") Long edad,
        @NotNull(message = "es obligatoria.") String identificacion,
        @NotNull(message = "es obligatoria.") String direccion,
        @NotNull(message = "es obligatorio.") String telefono
) {
}
