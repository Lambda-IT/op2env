import { FileSystem, Path, Terminal } from '@effect/platform'
import { Data, Effect } from 'effect'

export interface IShell {
    printenv: () => string
    install: (scriptPath: string) => Effect.Effect<void, unknown, FileSystem.FileSystem | Path.Path | Terminal.Terminal>
}

export class InstallError extends Data.TaggedError('InstallError')<{ message: string }> {}
