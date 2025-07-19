import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { AuthErrorMessages } from './auth.constants';
import { LoginResponse } from './interfaces/login-response.interface';

@Controller('auth')
export class AuthController {
	constructor(private authService: AuthService) {}

	@HttpCode(HttpStatus.OK)
	@UsePipes(ZodValidationPipe)
	@Post('login')
	async login(@Body() dto: LoginDto): Promise<LoginResponse> {
		const userIsValid = await this.authService.validateUser(dto);
		if (!userIsValid) {
			throw new BadRequestException(AuthErrorMessages.WRONG_PASSWORD);
		}
		const token = await this.authService.generateToken(dto);
		return { token };
	}
}
