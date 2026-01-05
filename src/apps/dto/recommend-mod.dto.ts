import { createZodDto } from 'nestjs-zod';
import { RecommendModSchema } from 'minecraft-manager-schemas';

export class RecommendModDto extends createZodDto(RecommendModSchema) {}
