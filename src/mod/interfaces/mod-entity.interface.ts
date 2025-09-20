import { Mod } from 'generated/prisma';
import { PartialFields } from 'src/common/types/partial-fields';

export type IModEntity = PartialFields<
	Mod,
	| 'id'
	| 'parsedSlug'
	| 'createdAt'
	| 'updatedAt'
	| 'isParsed'
	| 'descriptionImages'
	| 'htmlDescription'
	| 'commentCounts'
	| 'rating'
>;
