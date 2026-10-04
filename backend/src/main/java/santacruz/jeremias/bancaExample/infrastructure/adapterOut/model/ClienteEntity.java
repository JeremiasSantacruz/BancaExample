package santacruz.jeremias.bancaExample.infrastructure.adapterOut.model;

import jakarta.persistence.Entity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "clientes")
public class ClienteEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "persona_id", nullable = false, unique = true)
    private PersonaEntity personaEntity;
    private String contrasena;
    private String estado;

    protected ClienteEntity() {
    }

    public ClienteEntity(PersonaEntity personaEntity, String contrasena, String estado) {
        this.personaEntity = personaEntity;
        this.contrasena = contrasena;
        this.estado = estado;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public PersonaEntity getPersona() {
        return personaEntity;
    }

    public String getContrasena() {
        return contrasena;
    }

    public String getEstado() {
        return estado;
    }

    public void actualizar(String contrasena, String estado) {
        this.contrasena = contrasena;
        this.estado = estado;
    }
}
