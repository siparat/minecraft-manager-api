import { CreateModSchema } from 'minecraft-manager-schemas';
import { createZodDto } from 'nestjs-zod';

export class CreateModDto extends createZodDto(CreateModSchema) {}
