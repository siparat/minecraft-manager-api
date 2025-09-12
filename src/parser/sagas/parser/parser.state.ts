import { ParserSaga } from './parser.saga';

export abstract class ParserState {
	protected saga: ParserSaga;

	setContext(saga: ParserSaga): void {
		this.saga = saga;
	}

	abstract start(page?: number): Promise<void>;
	abstract stop(): ParserSaga;
}
