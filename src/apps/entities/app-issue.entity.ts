import { IssueStatus } from 'generated/prisma';
import { IAppIssueEntity } from '../interfaces/app-issue-entity.interface';

export class AppIssueEntity implements IAppIssueEntity {
	id?: number;
	createdAt?: Date;
	text: string;
	status?: IssueStatus;
	appId: number;

	constructor(issue: IAppIssueEntity) {
		Object.assign(this, issue);
	}
}
