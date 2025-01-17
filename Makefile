SHELL=/bin/bash -o pipefail

mkfile_path := $(abspath $(lastword $(MAKEFILE_LIST)))
mkfile_dir := $(dir $(mkfile_path))

echo_fail = printf "\e[31m✘ \033\e[0m$(1)\n"
echo_pass = printf "\e[32m✔ \033\e[0m$(1)\n"
echo_info = printf "\e[33mℹ \033\e[0m$(1)\n"
echo_bull = printf "\e[34m• \033\e[0m$1\n"

check-dependency = $(if $(shell command -v $(1)),$(call echo_pass,found $(1)),$(call echo_fail,$(1) not installed);exit 1)

PORTS_FILE := $(mkfile_dir)PORTS.env

include $(PORTS_FILE)
export

check-dependencies:
	@$(call check-dependency,node)
	@$(call check-dependency,npm)

test: check-dependencies
	npm run test

build: check-dependencies
	npm install

build-docker:
	@docker build -t kong-air-bookings-svc:dev .

run: check-dependencies
	node main.js ${KONG_AIR_BOOKINGS_PORT}

docker: build-docker
	@docker run -d --name kong-air-bookings-svc -p ${KONG_AIR_BOOKINGS_PORT}:${KONG_AIR_BOOKINGS_PORT} kong-air-bookings-svc:dev

kill-docker:
	-@docker stop kong-air-bookings-svc
	-@docker rm kong-air-bookings-svc
	@if [ $$? -ne 0 ]; then $(call echo_fail,Failed to kill the docker containers); exit 1; else $(call echo_pass,Killed the docker container); fi

