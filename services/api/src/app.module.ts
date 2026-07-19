import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ContactModule } from "./contact/contact.module";
import { MailModule } from "./mail/mail.module";
import { HealthController } from "./health.controller";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        // Global baseline throttle — the contact route tightens this further.
        ThrottlerModule.forRoot([
            { name: "default", ttl: 60_000, limit: 30 },
        ]),
        MailModule,
        ContactModule,
    ],
    controllers: [HealthController],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
