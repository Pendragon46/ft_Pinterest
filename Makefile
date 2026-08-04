# Self-signed dev TLS cert for nginx. Generated locally (not in git); idempotent.
# subjectAltName is required, not decorative: Node and current browsers ignore CN
# entirely, so a CN-only cert cannot be trusted even once it is in the trust
# store — and `make seed` relies on exactly that (NODE_EXTRA_CA_CERTS below).
# Certs generated before this rule have no SAN, so regenerate them.
certs:
	@if ! test -f nginx/ssl/nginx.key || ! test -f nginx/ssl/nginx.crt || \
		! openssl x509 -in nginx/ssl/nginx.crt -noout -text 2>/dev/null \
			| grep -q "Subject Alternative Name"; then \
		mkdir -p nginx/ssl && \
		openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
			-keyout nginx/ssl/nginx.key -out nginx/ssl/nginx.crt \
			-subj "/CN=localhost" \
			-addext "subjectAltName=DNS:localhost,IP:127.0.0.1" ; \
	fi

# docker-compose.yml declares `env_file: ./backend/.env` and `./frontend/.env`, and
# interpolates ${POSTGRES_*}/${GRAFANA_*} from ./.env. All three are gitignored, so a
# fresh clone has none of them and `docker compose up` aborts before starting anything.
# Seed them from the checked-in examples; never overwrite a file that already exists.
env:
	@for f in .env backend/.env frontend/.env; do \
		if ! test -f $$f; then \
			cp $$f.example $$f && \
			echo "→ $$f créé depuis $$f.example — renseignez-y vos secrets (Cloudinary, Google OAuth)"; \
		fi; \
	done

build:
	docker compose build

start: env certs build
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


seed: env certs
	NODE_EXTRA_CA_CERTS=nginx/ssl/nginx.crt node seed-network.mjs

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
