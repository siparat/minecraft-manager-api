import { UpdateSdkSchema } from 'minecraft-manager-schemas';
import { createZodDto } from 'nestjs-zod';

export class UpdateSdkDto extends createZodDto(UpdateSdkSchema.partial()) {}
