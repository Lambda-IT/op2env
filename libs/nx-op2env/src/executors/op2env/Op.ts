import { Command, Path } from '@effect/platform-node';
import { FileSystem } from '@effect/platform-node/FileSystem';
import * as PR from '@effect/schema/ParseResult';
import * as S from '@effect/schema/Schema';
import { Brand, Context, Data, Effect, Option, ReadonlyArray, ReadonlyRecord, pipe } from 'effect';

import { toLines, toString } from './Stream';

export type OpCliPath = string & Brand.Brand<'OpCliPath'>;
export const OpCliPath = Brand.nominal<OpCliPath>();

export const OpCliPathTag = Context.Tag<OpCliPath>('@lambda-it/op2env/op-cli-path');

export const OpSecretReference = S.string.pipe(
    S.filter(s => s.startsWith('op://')),
    S.brand('OpSecretReference'),
);
export type OpSecretReference = S.Schema.To<typeof OpSecretReference>;

export const OpReadOutput = S.transformOrFail(
    S.array(S.string),
    S.string,
    a => (a.length >= 1 ? PR.success(a[0]) : PR.failure(PR.index(0, [PR.missing]))),
    a => PR.success([a]),
);
export type OpReadOutput = S.Schema.To<typeof OpReadOutput>;

export const version = Effect.gen(function* (_) {
    const opCliPath = yield* _(OpCliPathTag);
    const command = Command.make(opCliPath, '--version');
    return yield* _(Command.string(command));
});

export const read = (secretReference: OpSecretReference) =>
    Effect.gen(function* (_) {
        const { stderr, stdout, exitCode } = yield* _(runOpCommand('read', secretReference));
        return yield* _(
            Effect.unified(
                exitCode !== 0
                    ? Effect.fail(new OpReadError({ secretReference, message: stderr }))
                    : S.parse(OpReadOutput)(stdout),
            ),
        );
    });

export class OpError extends Data.TaggedError('@lambda-it/nx-op2env/OpError')<{
    readonly message: string;
}> {}
export class OpReadError extends Data.TaggedError('@lambda-it/nx-op2env/OpReadError')<{
    readonly secretReference: OpSecretReference;
    readonly message: string;
}> {}

const runOpCommand = (...args: readonly string[]) =>
    Effect.gen(function* (_) {
        const opCliPath = yield* _(OpCliPathTag);
        const command = Command.make(opCliPath, ...args);
        const process = yield* _(Command.start(command));
        return yield* _(
            Effect.all({
                stderr: toString(process.stderr),
                stdout: toLines(process.stdout),
                exitCode: process.exitCode,
            }),
        );
    });

export const signin = Effect.gen(function* (_) {
    const { stderr, exitCode } = yield* _(runOpCommand('signin'));
    return yield* _(exitCode === 0 ? Effect.succeed(true as const) : Effect.fail(new OpError({ message: stderr })));
});

const regex = /^([\w\s]+):\s+(.*)$/;
const StringToOpWhoamiOutputKeyValue = S.transformOrFail(
    S.string,
    S.tuple(S.string, S.string),
    a =>
        pipe(a.match(regex), match =>
            match
                ? PR.success([match[1], match[2]])
                : PR.failure(PR.type(S.string.ast, a, 'line should be in format "key: value"')),
        ),
    ([key, value]) => PR.success(`${key}: ${value}`),
);

const OpWhoAmIOutput = S.transform(
    S.struct({ URL: S.string, Email: S.string, 'User ID': S.string }),
    S.struct({ url: S.string, email: S.string, userId: S.string }),
    a => ({ url: a.URL, email: a.Email, userId: a['User ID'] }),
    a => PR.success({ URL: a.url, Email: a.email, 'User ID': a.userId }),
);
export interface OpWhoAmIOutput extends S.Schema.To<typeof OpWhoAmIOutput> {}

const OpwhoamiOutput_ = S.transform(
    S.tuple(StringToOpWhoamiOutputKeyValue, StringToOpWhoamiOutputKeyValue, StringToOpWhoamiOutputKeyValue),
    OpWhoAmIOutput,
    a => pipe(a, ReadonlyRecord.fromEntries),
    PR.success,
);

export const LinesToOpWhoamiOutput = S.transformOrFail(
    S.array(S.string),
    OpwhoamiOutput_,
    a =>
        a.length < 3
            ? PR.failure(PR.type(S.tuple(S.string, S.string, S.string).ast, a))
            : PR.success(ReadonlyArray.take(a, 3)),
    PR.success,
);

export const whoami = Effect.gen(function* (_) {
    const { stderr, stdout, exitCode } = yield* _(runOpCommand('whoami'));
    return yield* _(
        Effect.unified(
            exitCode !== 0 ? Effect.fail(new OpError({ message: stderr })) : S.parse(LinesToOpWhoamiOutput)(stdout),
        ),
    );
});

export const findOpCliPath = Effect.gen(function* (_) {
    const path = yield* _(Path.Path);
    const envPaths = ReadonlyArray.reverse((globalThis.process.env.PATH || '').split(':'));

    for (const envPath of envPaths) {
        const validOpPath = yield* _(getValidPath(path.join(envPath, 'op')));
        if (Option.isSome(validOpPath)) return yield* _(Effect.succeed(Option.map(validOpPath, OpCliPath)));

        const validOpExePath = yield* _(getValidPath(path.join(envPath, 'op.exe')));
        if (Option.isSome(validOpExePath)) return yield* _(Effect.succeed(Option.map(validOpExePath, OpCliPath)));
    }

    return yield* _(Effect.succeed(Option.none<OpCliPath>()));
});

const getValidPath = (executablePath: string) =>
    Effect.gen(function* (_) {
        const fs = yield* _(FileSystem);
        return yield* _(
            fs.stat(executablePath),
            Effect.map(() => Option.some(executablePath)),
            Effect.catchAll(() => Effect.succeed(Option.none<string>())),
        );
    });
