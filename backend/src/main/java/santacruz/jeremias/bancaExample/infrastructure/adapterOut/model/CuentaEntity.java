package santacruz.jeremias.bancaExample.infrastructure.adapterOut.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "cuentas")
public class CuentaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private ClienteEntity clienteEntity;

    @Column(name = "tipo_cuenta", nullable = false)
    private String tipoCuenta;

    @Column(name = "saldo_inicial", nullable = false, precision = 19, scale = 2)
    private BigDecimal saldo;

    @Column(nullable = false)
    private String estado;

    protected CuentaEntity() {
    }

    public CuentaEntity(ClienteEntity clienteEntity, String tipoCuenta, BigDecimal saldoInicial, String estado) {
        this.clienteEntity = clienteEntity;
        this.tipoCuenta = tipoCuenta;
        this.saldo = saldoInicial;
        this.estado = estado;
    }

    public Long getId() {
        return id;
    }

    public ClienteEntity getCliente() {
        return clienteEntity;
    }

    public String getTipoCuenta() {
        return tipoCuenta;
    }

    public BigDecimal getSaldoInicial() {
        return saldo;
    }

    public BigDecimal getSaldoActual() {
        return saldo;
    }

    public String getEstado() {
        return estado;
    }

    public void actualizar(ClienteEntity clienteEntity, String tipoCuenta, BigDecimal saldoInicial, String estado) {
        this.clienteEntity = clienteEntity;
        this.tipoCuenta = tipoCuenta;
        this.saldo = saldoInicial;
        this.estado = estado;
    }

    public void actualizarSaldo(BigDecimal saldo) {
        this.saldo = saldo;
    }
}
