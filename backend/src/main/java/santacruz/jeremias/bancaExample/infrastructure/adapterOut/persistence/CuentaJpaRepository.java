package santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.CuentaEntity;

import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
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

    @Query("SELECT c FROM CuentaEntity c " +
            "WHERE (:clienteId is null or c.clienteEntity.id = :clienteId) " +
            "AND (:tipoCuenta is null or upper(c.tipoCuenta) = :tipoCuenta) " +
            "AND (:estado is null or upper(c.estado) = :estado) ")
    List<CuentaEntity> searchAll(@Param("clienteId") Long clienteId,
                               @Param("tipoCuenta") String tipoCuenta,
                               @Param("estado") String estado);
}
