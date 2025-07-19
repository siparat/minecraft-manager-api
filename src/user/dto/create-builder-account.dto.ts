import { CreateBuilderAccountSchema } from 'minecraft-manager-schemas';
import { createZodDto } from 'nestjs-zod';

export class CreateBuilderAccountDto extends createZodDto(CreateBuilderAccountSchema) {}
