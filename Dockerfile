ARG BUILD_FROM=ghcr.io/home-assistant/${BUILD_ARCH}-base:15.0.0
FROM ${BUILD_FROM}

ENV LANG C.UTF-8

# Build tooling for native deps (utf-8-validate via telegram)
RUN apk add --no-cache nodejs npm python3 make g++

WORKDIR /opt/blackout-time-parser

COPY rootfs/opt/blackout-time-parser/package*.json ./
RUN npm ci

COPY rootfs/ /
RUN chmod +x /etc/cont-init.d/00-banner /etc/services.d/blackout/run
RUN npm run build && npm prune --omit=dev

EXPOSE 3000
