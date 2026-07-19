.PHONY: install dev api client build build-api build-client clean

# Install dependencies for both services.
install:
	cd services/api && npm install
	cd services/public && npm install

# Run both dev servers together (API on :3000, client on :5173).
dev:
	@$(MAKE) -j 2 api client

api:
	cd services/api && npm run dev

client:
	cd services/public && npm run dev

# Production builds.
build: build-api build-client

build-api:
	cd services/api && npm run build

build-client:
	cd services/public && npm run build

clean:
	rm -rf services/api/dist services/api/node_modules
	rm -rf services/public/dist services/public/node_modules
