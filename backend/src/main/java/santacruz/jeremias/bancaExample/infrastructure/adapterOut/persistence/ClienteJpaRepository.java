package santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.ClienteEntity;

import java.util.Optional;

public interface ClienteJpaRepository extends JpaRepository<ClienteEntity, Long> {
    long countByPersonaEntity_Identificacion(String identificacion);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from ClienteEntity c where c.id = :clienteId")
    Optional<ClienteEntity> findByIdForUpdate(@Param("clienteId") Long clienteId);

    @Query("SELECT Count(*) FROM ClienteEntity c where c.estado = cast(:estado as string)")
    Long countByEstado(@Param("estado") String estado);

    /**
     * Listado paginado. El orden lo aporta el `Pageable` para que el corte de
     * páginas sea estable, y `searchId` es el texto de búsqueda interpretado
     * como número para encontrar por id.
     */
    @Query("""
            select c from ClienteEntity c
            where (cast(:nombre as string) is null or locate(lower(cast(:nombre as string)), lower(c.personaEntity.nombre)) > 0)
              and (cast(:identificacion as string) is null or locate(cast(:identificacion as string), c.personaEntity.identificacion) > 0)
              and (cast(:estado as string) is null or upper(c.estado) = cast(:estado as string))
              and (cast(:search as string) is null
                   or locate(lower(cast(:search as string)), lower(c.personaEntity.nombre)) > 0
                   or locate(cast(:search as string), c.personaEntity.identificacion) > 0
                   or locate(cast(:search as string), c.personaEntity.telefono) > 0
                   or locate(cast(:search as string), c.personaEntity.direccion) > 0
                   or (:searchId is not null and c.id = :searchId))
            """)
    Page<ClienteEntity> searchAll(@Param("nombre") String nombre,
                                  @Param("identificacion") String identificacion,
                                  @Param("estado") String estado,
                                  @Param("search") String search,
                                  @Param("searchId") Long searchId,
                                  Pageable pageable);
}
