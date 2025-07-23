import { Injectable } from '@nestjs/common';
import { Language } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class LanguageRepository {
	constructor(private database: DatabaseService) {}

	getAllLanguages(): Promise<Language[]> {
		return this.database.language.findMany();
	}
}
