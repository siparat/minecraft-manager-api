import { AppIssue } from 'generated/prisma';
import { PartialFields } from 'src/common/types/partial-fields';

export type IAppIssueEntity = PartialFields<AppIssue, 'id' | 'createdAt' | 'status'>;
