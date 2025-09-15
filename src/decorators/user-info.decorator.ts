import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const UserInfo = createParamDecorator(
	(_, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<Request>().user
);
