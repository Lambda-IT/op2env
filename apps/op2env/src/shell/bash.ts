import { FileSystem, Path, Terminal } from '@effect/platform'
import { Effect } from 'effect'

import { type IShell } from './Shell.js'
import * as unix from './unix.js'

export const bash = Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    return {
        printenv: unix.printenv,
        install: (scriptPath: string) =>
            Effect.gen(function* () {
                const assetsPath = yield* unix.getAssetsPath(scriptPath)
                const terminal = yield* Terminal.Terminal

                const script = yield* fs.readFileString(path.join(assetsPath, 'op2env.sh'))
                yield* terminal.display(
                    `You are login shell is bash. Plese copy the following function to your .bashrc file to complete the installation:\n`,
                )
                yield* terminal.display(script)
            }),
    } satisfies IShell
})
