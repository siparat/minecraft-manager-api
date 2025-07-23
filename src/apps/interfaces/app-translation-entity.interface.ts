import { AppTranslation } from 'generated/prisma';
import { PartialFields } from 'src/common/types/partial-fields';

export type IAppTranslationEntity = PartialFields<AppTranslation, 'id' | 'appId'>;
