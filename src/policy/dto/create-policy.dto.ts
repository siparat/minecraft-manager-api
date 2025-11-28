import { CreatePolicySchema } from 'minecraft-manager-schemas';
import { createZodDto } from 'nestjs-zod';

export class CreatePolicyDto extends createZodDto(CreatePolicySchema) {}
