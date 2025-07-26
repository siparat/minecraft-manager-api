import { CreateIssueSchema } from 'minecraft-manager-schemas';
import { createZodDto } from 'nestjs-zod';

export class CreateIssueDto extends createZodDto(CreateIssueSchema) {}
