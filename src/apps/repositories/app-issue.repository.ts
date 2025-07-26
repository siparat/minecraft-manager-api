import { AppIssue, IssueStatus } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';
import { AppIssueEntity } from '../entities/app-issue.entity';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { AppIssuesCounts } from '../interfaces/app-issue.interface';

@Injectable()
export class AppIssueRepository {
	constructor(private database: DatabaseService) {}

	async createIssue(appIssue: AppIssueEntity): Promise<AppIssue> {
		try {
			return await this.database.appIssue.create({ data: appIssue });
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла неожиданная ошибка при создании жалобы');
		}
	}

	findById(id: number): Promise<AppIssue | null> {
		return this.database.appIssue.findUnique({ where: { id } });
	}

	search(appId: number, take: number, skip: number, status?: IssueStatus): Promise<AppIssue[]> {
		return this.database.appIssue.findMany({ where: { appId, status }, take, skip });
	}

	async getCounts(appId: number): Promise<AppIssuesCounts> {
		const created = await this.database.appIssue.count({ where: { appId, status: IssueStatus.CREATED } });
		const solved = await this.database.appIssue.count({ where: { appId, status: IssueStatus.SOLVED } });
		return { created, solved };
	}

	async changeStatus(issueId: number, newStatus: IssueStatus): Promise<AppIssue> {
		try {
			return await this.database.appIssue.update({ where: { id: issueId }, data: { status: newStatus } });
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла неожиданная ошибка при изменении статуса жалобы');
		}
	}
}
