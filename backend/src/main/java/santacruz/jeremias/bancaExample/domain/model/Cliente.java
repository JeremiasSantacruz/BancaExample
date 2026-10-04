package santacruz.jeremias.bancaExample.domain.model;

import santacruz.jeremias.bancaExample.domain.enums.EstadoCliente;

public class Cliente extends Persona {
    private final String clienteId;
    private final String contrasena;
    private final EstadoCliente estado;

    public Cliente(String clienteId, Persona persona, String contrasena, EstadoCliente estado) {
        super(
                persona.nombre(),
                persona.genero(),
                persona.edad(),
                persona.identificacion(),
                persona.direccion(),
                persona.telefono()
        );
        this.clienteId = clienteId;
        this.contrasena = contrasena;
        this.estado = estado;
    }

    public String clienteId() {
        return clienteId;
    }

    public String contrasena() {
        return contrasena;
    }

    public EstadoCliente estado() {
        return estado;
    }
}
