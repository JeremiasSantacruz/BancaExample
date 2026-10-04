CREATE TABLE personas
(
    id             BIGINT AUTO_INCREMENT NOT NULL,
    nombre         VARCHAR(255)          NULL,
    genero         VARCHAR(255)          NULL,
    edad           BIGINT                NULL,
    identificacion VARCHAR(255)          NULL,
    direccion      VARCHAR(255)          NULL,
    telefono       VARCHAR(255)          NULL,
    CONSTRAINT pk_personas PRIMARY KEY (id)
);

CREATE TABLE clientes
(
    id         BIGINT AUTO_INCREMENT NOT NULL,
    persona_id BIGINT                NOT NULL,
    contrasena VARCHAR(255)          NULL,
    estado     VARCHAR(255)          NULL,
    CONSTRAINT pk_clientes PRIMARY KEY (id)
);

ALTER TABLE clientes
    ADD CONSTRAINT uc_clientes_persona UNIQUE (persona_id);

ALTER TABLE clientes
    ADD CONSTRAINT FK_CLIENTES_ON_PERSONA FOREIGN KEY (persona_id) REFERENCES personas (id);

CREATE TABLE cuentas
(
    id            BIGINT AUTO_INCREMENT NOT NULL,
    cliente_id    BIGINT                NOT NULL,
    tipo_cuenta   VARCHAR(255)          NOT NULL,
    saldo_inicial DECIMAL(19, 2)        NOT NULL,
    estado        VARCHAR(255)          NOT NULL,
    CONSTRAINT pk_cuentas PRIMARY KEY (id)
);

ALTER TABLE cuentas
    ADD CONSTRAINT FK_CUENTAS_ON_CLIENTE FOREIGN KEY (cliente_id) REFERENCES clientes (id);
