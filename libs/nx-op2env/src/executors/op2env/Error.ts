import { Data } from 'effect';

export class Op2EnvError extends Data.TaggedError('@lambda-it/op2env/Op2EnvError')<{ message: string }> {}
