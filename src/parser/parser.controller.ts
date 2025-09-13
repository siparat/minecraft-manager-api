import { Controller, Post, UseGuards } from '@nestjs/common';
import { ParserGateway } from './parser.gateway';
import { ParserService } from './parser.service';
import { ModRepository } from 'src/mod/repositories/mod.repository';
import { CronExpression, Cron } from '@nestjs/schedule';
import { ParserSaga } from './sagas/parser/parser.saga';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/user/guards/role.guard';
import { UserRole } from 'generated/prisma';

@Controller('parser')
export class ParserController {
	constructor(
		private parserGateway: ParserGateway,
		private parserService: ParserService,
		private modRepository: ModRepository
	) {}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Post()
	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async startParser(): Promise<void> {
		const saga = new ParserSaga(this.parserGateway, this.parserService, this.modRepository);
		saga.state.start();
	}
}
