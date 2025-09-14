import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards, UsePipes } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RoleGuard } from './guards/role.guard';
import { UserRole } from 'generated/prisma';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreateBuilderAccountDto } from './dto/create-builder-account.dto';
import { UserEntity } from './entities/user.entity';
import { Request } from 'express';
import { AuthErrorMessages } from 'src/auth/auth.constants';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@Controller('user')
export class UserController {
	constructor(private userService: UserService) {}

	@UseGuards(JwtAuthGuard)
	@Get('info')
	getInfo(@Req() req: Request): Omit<UserEntity, 'password' | 'setPassword' | 'comparePassword'> {
		if (!req.user) {
			throw new UnauthorizedException(AuthErrorMessages.UNAUTHORIZED);
		}
		const { password, ...entity } = new UserEntity(req.user);
		return entity;
	}

	@ApiBody({
		required: true,
		examples: { 'Создание сборщика': { value: { username: 'username', password: 'password' } } }
	})
	@ApiTags('for-admin')
	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@UsePipes(ZodValidationPipe)
	@Post('builder')
	async createBuilderAccount(@Body() dto: CreateBuilderAccountDto): Promise<UserEntity> {
		return this.userService.createBuilderAccount(dto);
	}
}
