.PHONY: emulation-up emulation-down emulation-logs

emulation-up:
	docker compose -f ../emulation/docker-compose.yml up -d --build

emulation-down:
	docker compose -f ../emulation/docker-compose.yml down -v

emulation-logs:
	docker compose -f ../emulation/docker-compose.yml logs -f

.PHONY: platform-up platform-down platform-logs

platform-up:
	docker compose -f ../platform/docker-compose.yml up -d --build

platform-down:
	docker compose -f ../platform/docker-compose.yml down -v

platform-logs:
	docker compose -f ../platform/docker-compose.yml logs -f

.PHONY: connectors-up, connectors-status

connectors-up:
	curl -X POST http://localhost:8083/connectors \
		-H "Content-Type: application/json" \
		-d @../platform/configs/mqtt-avs-sensors-source.json
	curl -X POST http://localhost:8083/connectors \
    	-H "Content-Type: application/json" \
    	-d @../platform/configs/avs-room-current-redis-sink.json
	curl -X POST http://localhost:8083/connectors \
		-H "Content-Type: application/json" \
		-d @../platform/configs/avs-postgres-sink.json

connectors-status:
	curl http://localhost:8083/connectors/mqtt-avs-sensors-source/status
	curl http://localhost:8083/connectors/avs-room-current-redis-sink/status
	curl http://localhost:8083/connectors/avs-postgres-sink/status

.PHONY: create-net, delete-net

create-net:
	docker network create avs-net

delete-net:
	docker network rm avs-net