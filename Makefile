build:
	docker compose build

start: build
	docker compose up -d --build

stop:
	docker compose down

rebuild: stop build
	docker compose up -d

restart: stop start

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

.PHONY: build start stop rebuild restart logs ps clean-volumes fclean backup restore recover health
