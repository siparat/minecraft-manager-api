import { SetOrderSchema } from 'minecraft-manager-schemas';
import { createZodDto } from 'nestjs-zod';

export class SetOrderDto extends createZodDto(SetOrderSchema) {}
