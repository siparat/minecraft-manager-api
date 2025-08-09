import { TranslateSchema } from 'minecraft-manager-schemas';
import { createZodDto } from 'nestjs-zod';

export class TranslateDto extends createZodDto(TranslateSchema) {}
