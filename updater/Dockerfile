FROM docker:27-cli

RUN apk add --no-cache git nodejs ca-certificates curl \
  && mkdir -p /usr/local/lib/docker/cli-plugins /usr/libexec/docker/cli-plugins \
  && ARCH="$(uname -m)" \
  && curl -fsSL "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-${ARCH}" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose \
  && cp /usr/local/lib/docker/cli-plugins/docker-compose /usr/libexec/docker/cli-plugins/docker-compose \
  && chmod +x /usr/local/lib/docker/cli-plugins/docker-compose /usr/libexec/docker/cli-plugins/docker-compose \
  && rm -rf /var/cache/apk/*

WORKDIR /srv
COPY server.mjs errors.mjs ./
ENV CHECKOUT=/checkout
ENV PORT=8091
EXPOSE 8091
CMD ["node", "server.mjs"]
