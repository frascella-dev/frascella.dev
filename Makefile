.PHONY: start serve dev build

start:
	@$(MAKE) -j 2 serve dev

serve:
	php artisan serve

dev:
	npm run dev

build:
	npm run build
