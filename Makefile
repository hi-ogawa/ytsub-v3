# auto generate phony targets
.PHONY: $(shell grep --no-filename -E '^([a-zA-Z_-]|/)+:' $(MAKEFILE_LIST) | sed 's/:.*//')

#
# tools
#
SHELLCHECK ?= docker run --rm -v $(PWD):/mnt:ro koalaman/shellcheck:v0.7.2
SCHEMACHECK ?= docker run --rm -i hiogawa/schemacheck # https://github.com/hi-ogawa/dockerfiles/blob/master/schemacheck/README.md

#
# lint
#

lint: lint/docker-compose lint/shellcheck lint/github-workflow

lint/docker-compose:
	docker-compose config -q

lint/shellcheck:
	$(SHELLCHECK) scripts/*.sh

lint/github-workflow:
	$(SCHEMACHECK) -s github-workflow -y < .github/workflows/ci.yml
	$(SCHEMACHECK) -s github-workflow -y < .github/workflows/health-check.yml

#
# db
#

db/seed:
	npm run cli -- create-user root pass

db/dump:
	docker-compose exec -T mysql mysqldump -uroot -ppassword ytsub_development | gzip -c > "misc/db/dump/$$(date '+%Y_%m_%d_%H_%M_%S').sql.gz"

db/restore:
	gunzip -c $$(ls misc/db/dump/*.sql.gz | tail -n 1) | docker-compose exec -T mysql mysql -uroot -ppassword ytsub_development

db/restore/dev:
	gunzip -c misc/db/dev.sql.gz | docker-compose exec -T mysql mysql -uroot -ppassword ytsub_development

db/dump/production:
	pscale org switch hiro18181-ytsub
	pscale database dump ytsub_production main --output misc/db/dump-pscale/$$(date '+%Y_%m_%d_%H_%M_%S')

db/restore/production:
	ls $$(find misc/db/dump-pscale -mindepth 1 -type d | sort | tail -n 1)/*.sql | sort -r | xargs cat | docker-compose exec -T mysql mysql -uroot -ppassword --default-character-set=utf8mb4 ytsub_development

db/reset: db/recreate db/migrate
db/reset/dev: db/recreate/dev db/migrate/dev
db/reset/test: db/recreate/test db/migrate/test

db/recreate: db/recreate/dev db/recreate/test

db/recreate/dev:
	docker-compose exec -T mysql mysql -uroot -ppassword -e 'DROP DATABASE IF EXISTS ytsub_development; CREATE DATABASE ytsub_development;'

db/recreate/test:
	docker-compose exec -T mysql mysql -uroot -ppassword -e 'DROP DATABASE IF EXISTS ytsub_test; CREATE DATABASE ytsub_test;'

db/migrate: db/migrate/dev db/migrate/test

db/migrate/dev:
	NODE_ENV=development pnpm knex migrate:latest

db/migrate/test:
	NODE_ENV=test npx pnpm migrate:latest

#
# docker
#

docker/up:
	docker-compose up -d
	docker-compose run --rm dockerize -timeout 60s -wait tcp://mysql:3306

docker/down:
	docker-compose down

docker/clean:
	docker-compose down -v --remove-orphans
	docker-compose rm -f -s -v
