import { LoginSchema } from 'minecraft-manager-schemas';
import { createZodDto } from 'nestjs-zod';

export class LoginDto extends createZodDto(LoginSchema) {}
