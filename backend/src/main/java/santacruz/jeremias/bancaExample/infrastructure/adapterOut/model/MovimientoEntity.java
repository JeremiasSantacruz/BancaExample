package santacruz.jeremias.bancaExample.infrastructure.adapterOut.model;

import jakarta.persistence.*;
import santacruz.jeremias.bancaExample.domain.enums.EstadoTransaccionMovimiento;
import santacruz.jeremias.bancaExample.domain.enums.TipoMovimiento;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "movimientos")
public class MovimientoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cuenta_id", nullable = false)
    private CuentaEntity cuentaEntity;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @Column(name = "tipo_movimiento", nullable = false)
    @Enumerated(EnumType.STRING)
    private TipoMovimiento tipoMovimiento;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal valor;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private EstadoTransaccionMovimiento estado;

    protected MovimientoEntity() {
    }

    public MovimientoEntity(
            CuentaEntity cuentaEntity,
            LocalDateTime fecha,
            TipoMovimiento tipoMovimiento,
            BigDecimal valor,
            EstadoTransaccionMovimiento estado
    ) {
        this.cuentaEntity = cuentaEntity;
        this.fecha = fecha;
        this.tipoMovimiento = tipoMovimiento;
        this.valor = valor;
        this.estado = estado;
    }

    public Long getId() {
        return id;
    }

    public CuentaEntity getCuenta() {
        return cuentaEntity;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public TipoMovimiento getTipoMovimiento() {
        return tipoMovimiento;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public EstadoTransaccionMovimiento getEstado() {
        return estado;
    }

    public void actualizarEstado(EstadoTransaccionMovimiento estado) {
        this.estado = estado;
    }
}
