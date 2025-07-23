import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const UploadImageSchema = z.object({
	oldImageFilename: z.optional(z.string().endsWith('.webp', { message: 'Указано не название файла' }))
});

export class UploadImageDto extends createZodDto(UploadImageSchema) {}
