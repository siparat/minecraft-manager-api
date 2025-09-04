import { Injectable, NotFoundException } from '@nestjs/common';
import { ModEntity } from './entities/mod.entity';
import { CreateModDto } from './dto/create-mod.dto';
import { ModRepository } from './repositories/mod.repository';
import { UpdateModDto } from './dto/update-mod.dto';
import { ModErrorMessages } from './mod.constants';

@Injectable()
export class ModService {
	constructor(private modRepository: ModRepository) {}

	async create(dto: CreateModDto, isParsed: boolean = false): Promise<ModEntity> {
		const modEntity = new ModEntity({ ...dto, isParsed }).setVersions(dto.versions.map((version) => ({ version })));
		const mod = await this.modRepository.create(modEntity);
		return new ModEntity(mod).setVersions(modEntity.versions);
	}

	async update(id: number, dto: UpdateModDto): Promise<ModEntity> {
		const mod = await this.modRepository.findById(id);
		if (!mod) {
			throw new NotFoundException(ModErrorMessages.NOT_FOUND);
		}

		const modEntity = new ModEntity({ ...mod, ...dto }).setVersions(
			dto.versions ? dto.versions.map((version) => ({ version })) : mod.versions
		);

		const updatedMod = await this.modRepository.update(id, modEntity);
		return new ModEntity(updatedMod).setVersions(modEntity.versions);
	}

	async delete(id: number): Promise<void> {
		const mod = await this.modRepository.findById(id);
		if (!mod) {
			throw new NotFoundException(ModErrorMessages.NOT_FOUND);
		}

		await this.modRepository.delete(id);
	}
}
