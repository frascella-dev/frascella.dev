import { NestFactory } from "@nestjs/core";
import { ValidationPipe, UnprocessableEntityException } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // All routes live under /api to mirror the old Laravel API surface.
    app.setGlobalPrefix("api");

    // The portfolio SPA is served from a different origin (Vite dev server /
    // static host), so CORS is required. Allowed origins come from env as a
    // comma-separated list; "*" (default) is fine for a public contact form.
    const origins = (process.env.CORS_ORIGINS ?? "*")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
    app.enableCors({
        origin: origins.includes("*") ? true : origins,
        methods: ["GET", "POST"],
    });

    // Validation errors are reshaped into Laravel's 422 body
    // (`{ message, errors: { field: [msg] } }`) so the existing frontend
    // error-flattening helper keeps working unchanged.
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: false,
            transform: true,
            exceptionFactory: (errors: ValidationError[]) => {
                const flat: Record<string, string[]> = {};
                for (const err of errors) {
                    flat[err.property] = Object.values(err.constraints ?? {});
                }
                const first = Object.values(flat)[0]?.[0] ?? "Validation failed.";
                return new UnprocessableEntityException({
                    message: first,
                    errors: flat,
                });
            },
        }),
    );

    const port = Number(process.env.PORT ?? 3000);
    await app.listen(port, "0.0.0.0");
    // eslint-disable-next-line no-console
    console.log(`API listening on http://0.0.0.0:${port}/api`);
}

bootstrap();
