.PHONY: start serve dev build

start:
	@$(MAKE) -j 2 serve dev

serve:
	php artisan serve --host=0.0.0.0 --port=8000

dev:
	npm run dev

build:
	npm run build
