import { CreateModSchema } from 'minecraft-manager-schemas';
import { createZodDto } from 'nestjs-zod';

export class UpdateModDto extends createZodDto(CreateModSchema.partial()) {}
