import { ParserStatus } from 'src/parser/parser.constants';
import { ParserState } from './parser.state';
import { ParserStateStarted, ParserStateStopped } from './parser.steps';
import { ParserGateway } from 'src/parser/parser.gateway';
import { ParserService } from 'src/parser/parser.service';
import { Logger } from '@nestjs/common';
import { ModRepository } from 'src/mod/repositories/mod.repository';
import { ParsedModShort } from 'src/parser/interfaces/mod.interface';
import { ModEntity } from 'src/mod/entities/mod.entity';
import { Mod } from 'generated/prisma';

export class ParserSaga {
	private page: number;
	state: ParserState;
	status: ParserStatus;

	constructor(
		private parserGateway: ParserGateway,
		private parserService: ParserService,
		private modRepository: ModRepository
	) {
		this.page = 1;
		this.setState(ParserStatus.STOPPED);
	}

	setState(status: ParserStatus): void {
		switch (status) {
			case ParserStatus.STARTED:
				this.state = new ParserStateStarted();
				break;
			case ParserStatus.STOPPED:
				this.state = new ParserStateStopped();
				break;
		}
		this.status = status;
		this.state.setContext(this);
	}

	clear(): void {
		this.page = 1;
	}

	async processSearchPage(pageNumber: number): Promise<ParsedModShort[] | null> {
		try {
			const page = await this.parserGateway.getModSearchPage(pageNumber);
			if (!page) {
				return null;
			}
			return this.parserService.parseModsFromSearchPage(page);
		} catch (error) {
			this.setState(ParserStatus.STOPPED);
			Logger.error(error);
			Logger.warn('Парсер был остановлен');
			return null;
		}
	}

	async start(page?: number): Promise<void> {
		Logger.log(`Парсер начинает работу с ${page || this.page} страницы`);
		if (page) {
			this.page = page;
		}

		while (this.status == ParserStatus.STARTED) {
			const allSlugs = await this.modRepository.getModSlugs();
			const shortMods = await this.processSearchPage(this.page);
			if (!shortMods) {
				return this.setState(ParserStatus.STOPPED);
			}

			for (const { slug } of shortMods) {
				const modPage = await this.parserGateway.getModPage(slug);
				if (!modPage) {
					continue;
				}
				const mod = await this.parserService.parseMod(slug, modPage);
				if (!mod) {
					continue;
				}

				const entity = new ModEntity({
					...mod,
					parsedSlug: slug,
					htmlDescription: mod.descriptionHtml,
					files: mod.downloads?.map((d) => d.file),
					isParsed: true
				});
				entity.setVersions(mod.versions.map((version) => ({ version })));
				if (allSlugs.includes(slug)) {
					const { id } = (await this.modRepository.findBySlug(slug)) as Mod;
					await this.modRepository.update(id, entity);
					Logger.log(`Мод ${slug} был обновлен`);
					continue;
				}
				await this.modRepository.create(entity);
				Logger.log(`Мод ${slug} был добавлен`);
			}

			this.page++;
		}

		Logger.log('Парсер закончил работу');
	}
}
