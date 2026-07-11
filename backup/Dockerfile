FROM postgres:16-alpine

RUN apk add --no-cache \
    bash \
    curl \
    docker-cli \
    netcat-openbsd

WORKDIR /scripts

COPY scripts/ /scripts/
COPY backup/supercronic /usr/local/bin/supercronic
COPY backup/backup.cron /etc/backup.cron

RUN chmod +x /scripts/*.sh
RUN chmod +x /usr/local/bin/supercronic

CMD ["supercronic", "/etc/backup.cron"]