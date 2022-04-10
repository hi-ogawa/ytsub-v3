# auto generate phony targets
.PHONY: $(shell grep --no-filename -E '^([a-zA-Z_-]|\/)+:' $(MAKEFILE_LIST) | sed 's/:.*//')

#
# tools
#
SHELLCHECK ?= docker run --rm -v $(PWD):/mnt:ro koalaman/shellcheck:v0.7.2

#
# lint
#

lint/all: lint/docker-compose lint/shellcheck

lint/docker-compose:
	docker-compose config -q

lint/shellcheck:
	$(SHELLCHECK) scripts/*.sh

#
# db
#

db/seed:
	npm run cli -- create-user root pass

db/reset: db/recreate db/migrate
db/reset/dev: db/recreate/dev db/migrate/dev
db/reset/test: db/recreate/test db/migrate/test

db/recreate: db/recreate/dev db/recreate/test

db/recreate/dev:
	docker-compose exec -T mysql mysql -uroot -ppassword -e 'DROP DATABASE IF EXISTS ytsub_development; CREATE DATABASE ytsub_development;'

db/recreate/test:
	docker-compose exec -T mysql mysql -uroot -ppassword -e 'DROP DATABASE IF EXISTS ytsub_test; CREATE DATABASE ytsub_test;'

db/migrate: db/reset/dev db/reset/test

db/migrate/dev:
	NODE_ENV=development npx knex migrate:latest

db/migrate/test:
	NODE_ENV=test npx knex migrate:latest

#
# docker
#

docker/up:
	docker-compose up -d mysql
	docker-compose run --rm dockerize -timeout 60s -wait tcp://mysql:3306

docker/down:
	docker-compose down

docker/clean:
	docker-compose down -v --remove-orphans
	docker-compose rm -f -s -v
