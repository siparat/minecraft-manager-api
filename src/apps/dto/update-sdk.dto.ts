import { UpdateSdkSchema } from 'minecraft-manager-schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class UpdateSdkDto extends createZodDto(
	UpdateSdkSchema.extend({
		skipBeforeFirstInterAdsCount: z.number().min(0),
		tgRu: z.string().nullable(),
		tgOther: z.string().nullable()
	}).partial()
) {}
