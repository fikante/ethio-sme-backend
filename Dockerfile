FROM sail-8.5/app:latest

USER root

WORKDIR /var/www/html

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000 5173

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
