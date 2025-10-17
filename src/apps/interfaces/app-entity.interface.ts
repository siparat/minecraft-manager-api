import { App } from 'generated/prisma';
import { PartialFields } from 'src/common/types/partial-fields';

export type IAppEntity = PartialFields<
	App,
	| 'id'
	| 'appScreenshots'
	| 'createdAt'
	| 'status'
	| 'updatedAt'
	| 'apk'
	| 'bundle'
	| 'banner'
	| 'firebaseFile'
	| 'order'
>;
