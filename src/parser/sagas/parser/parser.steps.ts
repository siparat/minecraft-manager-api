import { ParserErrorMessages, ParserStatus } from 'src/parser/parser.constants';
import { ParserSaga } from './parser.saga';
import { ParserState } from './parser.state';
import { ConflictException } from '@nestjs/common';

export class ParserStateStopped extends ParserState {
	async start(page?: number): Promise<void> {
		this.saga.setState(ParserStatus.STARTED);
		await this.saga.start(page);
	}
	stop(): ParserSaga {
		throw new ConflictException(ParserErrorMessages.ALREADY_STARTED);
	}
}

export class ParserStateStarted extends ParserState {
	async start(): Promise<void> {
		return;
	}
	stop(): ParserSaga {
		this.saga.setState(ParserStatus.STOPPED);
		this.saga.clear();
		return this.saga;
	}
}
