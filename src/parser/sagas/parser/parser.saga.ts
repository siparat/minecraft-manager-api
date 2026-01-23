import { ParserStatus } from 'src/parser/parser.constants';
import { ParserState } from './parser.state';
import { ParserStateStarted, ParserStateStopped } from './parser.steps';
import { ParserGateway } from 'src/parser/parser.gateway';
import { ParserService } from 'src/parser/parser.service';
import { Logger } from '@nestjs/common';
import { ModRepository } from 'src/mod/repositories/mod.repository';
import { ParsedModShort } from 'src/parser/interfaces/mod.interface';
import { ModEntity } from 'src/mod/entities/mod.entity';
import { ModWithVersions } from 'src/mod/interfaces/mod.interface';

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
			const html = await this.parserGateway.getModSearchPage(pageNumber);
			if (!html) return null;
			return this.parserService.parseModsFromSearchPage(html);
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
				const pageData = await this.parserGateway.getModPage(slug);
				if (!pageData) continue;

				const mod = await this.parserService.parseMod(slug, pageData.nuxtState);
				if (!mod) continue;

				const entity = new ModEntity({
					...mod,
					parsedSlug: slug,
					htmlDescription: mod.descriptionHtml,
					files: mod.downloads?.map((d) => d.file),
					isParsed: true
				});
				entity.setVersions(mod.versions.map((version) => ({ version })));
				if (allSlugs.includes(slug)) {
					const mod = (await this.modRepository.findBySlug(slug)) as ModWithVersions;
					entity.setVersions(entity.versions.concat(mod.versions));
					if (mod.files[0]?.startsWith('https://s3.')) {
						entity.files = mod.files;
					}
					await this.modRepository.update(mod.id, entity);
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
