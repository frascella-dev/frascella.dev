import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    ServiceUnavailableException,
    UnprocessableEntityException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ContactDto } from "./dto/contact.dto";
import { ContactService } from "./contact.service";

@Controller("contact")
export class ContactController {
    constructor(private readonly contacts: ContactService) {}

    // Tighter than the global throttle: 5 submissions per hour per IP.
    @Throttle({ contact: { ttl: 3_600_000, limit: 5 } })
    @Post()
    @HttpCode(HttpStatus.OK)
    async store(@Body() dto: ContactDto) {
        const result = await this.contacts.submit(dto.name, dto.email, dto.message);

        if (!result.ok) {
            if (result.reason === "mail_not_configured") {
                throw new ServiceUnavailableException({
                    status: "error",
                    message: "Mail is not configured on the server.",
                });
            }

            const message =
                result.reason === "cooldown"
                    ? "You sent a message recently — please wait a bit before sending another."
                    : "Could not deliver your message right now.";

            // Mirror Laravel's 422 body so the SPA surfaces it on the field.
            throw new UnprocessableEntityException({
                message,
                errors: { message: [message] },
            });
        }

        return { status: "ok", message: "Message sent." };
    }
}
