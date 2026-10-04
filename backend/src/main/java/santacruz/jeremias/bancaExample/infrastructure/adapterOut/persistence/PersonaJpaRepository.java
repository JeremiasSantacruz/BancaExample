package santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.PersonaEntity;

public interface PersonaJpaRepository extends JpaRepository<PersonaEntity, Long> {
    Boolean existsByIdentificacion(String identificacion);
}
