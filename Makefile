build:
	docker compose build --no-cache
	@sleep 3

start: build
	docker compose up -d

up:
	docker compose up -d

down:
	docker compose down

stop: down

restart:
	docker compose restart
	@sleep 3

logs:
	docker compose logs -f

ps:
	docker compose ps

clean:
	docker-compose down --remove-orphans

fclean: clean
	docker image prune -a --force
	docker volume prune --force
	docker system prune -a --volumes

PHONY: build start up down stop restart logs ps clean fclean