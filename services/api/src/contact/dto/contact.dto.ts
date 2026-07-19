import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from "class-validator";

export class ContactDto {
    @IsString()
    @IsNotEmpty({ message: "Please enter your name" })
    @MinLength(2, { message: "Please enter your name" })
    @MaxLength(120)
    name!: string;

    @IsEmail({}, { message: "Please enter a valid email" })
    @MaxLength(180)
    email!: string;

    @IsString()
    @MinLength(10, { message: "At least 10 characters" })
    @MaxLength(5000)
    message!: string;

    // Honeypot — a real user never fills this hidden field. Any content
    // here means a bot, so we reject it. Kept optional so genuine, empty
    // submissions pass validation.
    @IsOptional()
    @IsString()
    @MaxLength(0, { message: "Rejected." })
    website?: string;
}
