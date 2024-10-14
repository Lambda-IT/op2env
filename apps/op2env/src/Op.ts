import { Command } from '@effect/platform'
import { Data, Effect, pipe } from 'effect'

import { toLines, toString } from './Stream.js'

export class OpError extends Data.TaggedError('OpError')<{
    readonly error: unknown
    readonly message: string
    readonly params: Record<string, unknown>
}> {
    override toString() {
        return `${this._tag}(${JSON.stringify(
            { message: this.message, error: this.error, params: this.params },
            null,
            2,
        )})`
    }
}

export const fetchSecretsAndListAllEnvironmentVariables = (files: string[]) =>
    Effect.gen(function* () {
        yield* signin

        const process = yield* pipe(
            Command.make('op', 'run', ...files.map((file) => `--env-file=${file}`), '--no-masking', '--', 'printenv'),
            Command.start,
        )
        const { stderr, stdout, exitCode } = yield* Effect.all({
            stderr: toString(process.stderr),
            stdout: toLines(process.stdout),
            exitCode: process.exitCode,
        })

        if (exitCode !== 0) {
            yield* new OpError({
                error: stderr,
                message: 'Failed to fetch secrets and list all environment variables',
                params: { files },
            })
        }

        return stdout
    }).pipe(Effect.scoped)

export const signin = Effect.gen(function* () {
    const process = yield* pipe(Command.make('op', 'signin'), Command.start)
    const { stderr, stdout, exitCode } = yield* Effect.all({
        stderr: toString(process.stderr),
        stdout: toLines(process.stdout),
        exitCode: process.exitCode,
    })

    if (exitCode !== 0) {
        yield* new OpError({ error: stderr, message: 'Failed to sign in', params: {} })
    }

    return stdout
})
