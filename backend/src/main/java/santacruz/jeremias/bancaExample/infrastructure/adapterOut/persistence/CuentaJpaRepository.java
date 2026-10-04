package santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.CuentaEntity;

import java.util.List;
import java.util.Optional;

public interface CuentaJpaRepository extends JpaRepository<CuentaEntity, Long> {
    List<CuentaEntity> findAllByClienteEntity_Id(Long clienteId);
    Optional<CuentaEntity> findAllByClienteEntity_IdAndTipoCuenta(Long clienteId, String tipoCuenta);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CuentaEntity c where c.id = :cuentaId")
    Optional<CuentaEntity> findByIdForUpdate(@Param("cuentaId") Long cuentaId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update CuentaEntity c set c.estado = :estado where c.clienteEntity.id = :clienteId")
    int actualizarEstadoPorClienteId(
            @Param("clienteId") Long clienteId,
            @Param("estado") String estado
    );

    @Query("""
            select c from CuentaEntity c
            where (:clienteId is null or c.clienteEntity.id = :clienteId)
              and (cast(:tipoCuenta as string) is null or upper(c.tipoCuenta) = :tipoCuenta)
              and (cast(:estado as string) is null or upper(c.estado) = :estado)
              and (cast(:search as string) is null
                   or locate(lower(cast(:search as string)), lower(c.tipoCuenta)) > 0
                   or locate(lower(cast(:search as string)), lower(c.estado)) > 0
                   or (:searchId is not null and (c.id = :searchId or c.clienteEntity.id = :searchId)))
            """)
    Page<CuentaEntity> searchAll(@Param("clienteId") Long clienteId,
                                 @Param("tipoCuenta") String tipoCuenta,
                                 @Param("estado") String estado,
                                 @Param("search") String search,
                                 @Param("searchId") Long searchId,
                                 Pageable pageable);
}