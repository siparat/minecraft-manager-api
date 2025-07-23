import { CreateAppSchema } from 'minecraft-manager-schemas';
import { createZodDto } from 'nestjs-zod';

export class CreateAppDto extends createZodDto(CreateAppSchema) {}
