import { CreateAppSchema } from 'minecraft-manager-schemas';
import { createZodDto } from 'nestjs-zod';

export class UpdateAppDto extends createZodDto(CreateAppSchema.partial()) {}
