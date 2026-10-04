package santacruz.jeremias.bancaExample.infrastructure.adapterOut.persistence;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import santacruz.jeremias.bancaExample.domain.enums.EstadoTransaccionMovimiento;
import santacruz.jeremias.bancaExample.domain.enums.TipoMovimiento;
import santacruz.jeremias.bancaExample.infrastructure.adapterOut.model.MovimientoEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MovimientoJpaRepository extends JpaRepository<MovimientoEntity, Long> {
    @Query("""
            select m from MovimientoEntity m
            where m.cuentaEntity.clienteEntity.id = :clienteId
              and (cast(:inicio as timestamp) is null or m.fecha >= :inicio)
              and (cast(:fin as timestamp) is null or m.fecha < :fin)
            order by m.fecha desc, m.id desc
            """)
    List<MovimientoEntity> searchByCliente(@Param("clienteId") Long clienteId,
                                         @Param("inicio") LocalDateTime inicio,
                                         @Param("fin") LocalDateTime fin);
    @Query("""
            select m from MovimientoEntity m
            where (:cuentaId is null or m.cuentaEntity.id = :cuentaId)
              and (cast(:inicio as timestamp) is null or m.fecha >= :inicio)
              and (cast(:fin as timestamp) is null or m.fecha < :fin)
            order by m.fecha desc, m.id desc
            """)
    List<MovimientoEntity> searchAll(@Param("cuentaId") Long cuentaId,
                                   @Param("inicio") LocalDateTime inicio,
                                   @Param("fin") LocalDateTime fin);

    List<MovimientoEntity> findAllByCuentaEntity_Id(Long cuentaId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from MovimientoEntity m where m.id = :movimientoId")
    Optional<MovimientoEntity> findByIdForUpdate(@Param("movimientoId") Long movimientoId);

    @Query("""
            select coalesce(sum(m.valor), 0)
            from MovimientoEntity m
            where m.cuentaEntity.id = :cuentaId
              and m.fecha >= :inicio
              and m.fecha < :fin
              and m.tipoMovimiento = :tipoMovimiento
              and m.estado in (:estados)
            """)
    BigDecimal sumarExtraccionesAplicadas(
            @Param("cuentaId") Long cuentaId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin,
            @Param("tipoMovimiento") TipoMovimiento tipoMovimiento,
            @Param("estados") List<EstadoTransaccionMovimiento> estados
    );

    @Query("SELECT m FROM MovimientoEntity m " +
            "WHERE m.fecha >= :inicio " +
            "AND m.fecha < :fin")
    List<MovimientoEntity> findAllByFechaBetween(
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin
    );

}
