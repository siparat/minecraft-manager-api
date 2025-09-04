import { Mod } from 'generated/prisma';
import { PartialFields } from 'src/common/types/partial-fields';

export type IModEntity = PartialFields<Mod, 'id' | 'createdAt' | 'updatedAt' | 'isParsed' | 'descriptionImages'>;
