# Self-signed dev TLS cert for nginx. Generated locally (not in git); idempotent.
certs:
	@test -f nginx/ssl/nginx.key || { \
		mkdir -p nginx/ssl && \
		openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
			-keyout nginx/ssl/nginx.key -out nginx/ssl/nginx.crt \
			-subj "/CN=localhost" ; \
	}

build:
	docker compose build

start: certs build
	docker compose up -d --build
	@echo "Attente de l'API (backend + nginx + db)…"
	@for i in $$(seq 1 60); do \
		curl -fsk -o /dev/null https://localhost:8443/api/search/artworks && break; \
		sleep 2; \
	done
	@$(MAKE) --no-print-directory seed || echo "⚠ seed échoué — relancer 'make seed' (Node 18+ requis sur l'hôte)"

stop:
	docker compose down

rebuild: stop build
	docker compose up -d

restart: stop start

# Peuple la base via l'API (stack déjà démarrée). Node 18+ requis sur l'hôte ;
# lit les manifestes de seed-data/ et publie le réseau de démo (18 auteurs).
seed:
	node seed-network.mjs

logs:
	docker compose logs -f

ps:
	docker compose ps

clean-volumes:
	docker compose down -v

fclean: clean-volumes
	docker system prune -af --volumes

backup:
	docker exec ft_pinterest_backup /scripts/backup.sh

restore:
ifndef BACKUP_FILE
	@echo "Usage:"
	@echo "make restore BACKUP_FILE=/backups/backup.sql"
else
	docker exec ft_pinterest_backup \
	/scripts/restore.sh $(BACKUP_FILE)
endif

recover:
	docker exec ft_pinterest_backup /scripts/disaster_recovery.sh

health:
	docker exec ft_pinterest_backup /scripts/health_check.sh

.PHONY: certs build start stop rebuild restart seed logs ps clean-volumes fclean backup restore recover health
