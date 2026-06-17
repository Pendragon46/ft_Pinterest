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

PHONY: build start stop modify logs ps clean fclean restart
