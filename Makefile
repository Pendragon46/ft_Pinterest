build:
	docker compose build

start: build
	docker compose up -d --build

stop:
	docker compose down

modify: stop start

logs:
	docker compose logs -f

ps:
	docker compose ps

clean:
	docker-compose down -v

fclean: clean
	docker system prune -af --volumes

restart: fclean start

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

PHONY: build start stop modify logs ps clean fclean restart
