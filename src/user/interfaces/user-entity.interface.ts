import { User } from 'generated/prisma';
import { PartialFields } from 'src/common/types/partial-fields';

export type IUserEntity = PartialFields<User, 'id' | 'role'>;
