import * as Fs from '@effect/platform/FileSystem';
import { CommandExecutor as NodeCommandExecutor, FileSystem as NodeFileSystem } from '@effect/platform-node';
import * as S from '@effect/schema/Schema';
import { ExecutorContext, parseTargetString, runExecutor } from '@nx/devkit';
import { Console, Effect, Layer, ReadonlyRecord, Tuple, pipe } from 'effect';

import { Op2EnvError } from './Error';
import * as Op from './Op';
import { Op2envExecutorSchema } from './schema';

export default async function op2envExecutor(options: Op2envExecutorSchema, context: ExecutorContext) {
    const { project, target, configuration } = parseTargetString(options.childTarget, context);

    const program = pipe(
        Effect.gen(function* (_) {
            const fs = yield* _(Fs.FileSystem);
            if (!(yield* _(fs.exists('nx.json')))) {
                return yield* _(
                    Effect.fail(new Op2EnvError({ message: `The current directory isn't part of an Nx workspace.` })),
                );
            }

            const version = yield* _(Op.version);
            yield* _(Console.log('1password CLI version: ', version));

            yield* _(Op.signin);

            const iam = yield* _(Op.whoami);
            yield* _(Console.log('URL: ', iam.url));
            yield* _(Console.log('Email: ', iam.email));
            yield* _(Console.log('User Id: ', iam.userId));

            const opSecretReferencesRecord = yield* _(
                Effect.all(
                    pipe(
                        process.env,
                        ReadonlyRecord.map(value => S.parseEither(Op.OpSecretReference)(value)),
                        ReadonlyRecord.separate,
                        Tuple.getSecond,
                        ReadonlyRecord.map(Op.read),
                    ),
                    { concurrency: 'unbounded' },
                ),
            );

            for (const key in opSecretReferencesRecord) {
                process.env[key] = opSecretReferencesRecord[key];
            }
        }),
        Effect.matchEffect({
            onSuccess: () => Effect.succeed(true),
            onFailure: a => {
                switch (a._tag) {
                    case '@lambda-it/nx-op2env/OpReadError':
                        return Console.log(a.message).pipe(() => Effect.succeed(false));
                    default:
                        return Console.log(JSON.stringify(a)).pipe(() => Effect.succeed(false));
                }
            },
        }),
    );

    const runnable = Effect.provide(
        program,
        Layer.mergeAll(
            NodeCommandExecutor.layer.pipe(Layer.use(NodeFileSystem.layer)),
            NodeFileSystem.layer,
            Layer.succeed(Op.OpCliPathTag, Op.OpCliPath('/mnt/c/Program Files/1Password CLI/op.exe')),
        ),
    );

    const success = await Effect.runPromise(runnable);

    if (success) {
        for await (const _ of await runExecutor({ project, target, configuration }, {}, context)) {
            /* empty */
        }
    }

    return { success: true };
}
