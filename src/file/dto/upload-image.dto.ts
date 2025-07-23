import { UploadImageSchema } from 'minecraft-manager-schemas';
import { createZodDto } from 'nestjs-zod';

export class UploadImageDto extends createZodDto(UploadImageSchema) {}
