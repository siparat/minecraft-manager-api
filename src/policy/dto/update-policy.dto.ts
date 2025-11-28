import { CreatePolicySchema } from 'minecraft-manager-schemas';
import { createZodDto } from 'nestjs-zod';

export class UpdatePolicyDto extends createZodDto(CreatePolicySchema.partial()) {}
