# Etapa de build: compila el jar con el JDK que pide el toolchain (Java 25).
FROM eclipse-temurin:25-jdk AS build

WORKDIR /workspace

# El wrapper de Gradle se copia solo: es la primera capa que cambia cuando
# cambia la version de Gradle, no el codigo.
COPY gradlew ./
COPY gradle gradle

# Descarga las dependencias en una capa aparte para que `docker build` no las
# vuelva a bajar en cada cambio de codigo.
COPY settings.gradle.kts build.gradle.kts ./
RUN chmod +x gradlew \
    && ./gradlew --no-daemon --console=plain dependencies --configuration runtimeClasspath

COPY src src
RUN ./gradlew --no-daemon --console=plain bootJar -x test

# Etapa de runtime: solo la JRE y el jar ejecutable.
FROM eclipse-temurin:25-jre AS runtime

# curl se usa unicamente para el healthcheck del contenedor.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /workspace/build/libs/*.jar app.jar

# Usuario sin privilegios: el contenedor no necesita root para servir el API.
RUN useradd --system --uid 1001 --create-home spring
USER spring

EXPOSE 8080

ENV JAVA_OPTS=""

# El endpoint paginado devuelve 200 solo cuando el backend ya conecto con
# PostgreSQL, asi que el healthcheck tambien cubre la base de datos.
HEALTHCHECK --interval=5s --timeout=5s --start-period=45s --retries=20 \
    CMD curl --fail --silent "http://localhost:8080/clientes?page=0&size=1" > /dev/null || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]