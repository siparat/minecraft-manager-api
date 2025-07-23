import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RoleGuard } from './guards/role.guard';
import { UserRole } from 'generated/prisma';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreateBuilderAccountDto } from './dto/create-builder-account.dto';
import { UserEntity } from './entities/user.entity';

@Controller('user')
export class UserController {
	constructor(private userService: UserService) {}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@UsePipes(ZodValidationPipe)
	@Post('builder')
	async createBuilderAccount(@Body() dto: CreateBuilderAccountDto): Promise<UserEntity> {
		return this.userService.createBuilderAccount(dto);
	}
}
