# Build stage
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY pom.xml checkstyle.xml ./
RUN apk add --no-cache maven
COPY src ./src
RUN mvn clean package -DskipTests -Dcheckstyle.skip=true -B -Dspring.profiles.active=docker

# Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN apk add --no-cache curl
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=docker
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -sf http://localhost:8080/api/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]