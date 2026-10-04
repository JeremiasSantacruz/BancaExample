package santacruz.jeremias.bancaExample.infrastructure.adapterIn.dto;

public record ClienteResponse(
        String clienteId,
        String contrasena,
        String estado,
        String nombre,
        String genero,
        Long edad,
        String identificacion,
        String direccion,
        String telefono
) {
}
