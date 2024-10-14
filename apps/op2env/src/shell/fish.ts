import { FileSystem, Path, Terminal } from '@effect/platform'
import { Config, Console, Effect, Either } from 'effect'

import { type IShell, InstallError } from './Shell.js'
import * as unix from './unix.js'

export const fish = Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    return {
        printenv: unix.printenv,
        install: (scriptPath: string) =>
            Effect.gen(function* () {
                const assetsPath = yield* unix.getAssetsPath(scriptPath)

                const configHome = yield* Effect.either(
                    Config.string('XDG_CONFIG_HOME').pipe(
                        Effect.orElse(() =>
                            Config.string('HOME').pipe(Effect.map((h) => path.join(h, '.config/fish'))),
                        ),
                    ),
                )

                if (Either.isLeft(configHome)) {
                    yield* new InstallError({ message: 'Could not determine fish config directory' })
                    return
                }

                if (!(yield* fs.exists(configHome.right))) {
                    yield* new InstallError({ message: `Fish config directory ${configHome.right} does not exist` })
                    return
                }

                const functionsPath = path.join(configHome.right, 'functions')
                if (!(yield* fs.exists(functionsPath))) {
                    yield* new InstallError({
                        message: `Fish config functions directory ${functionsPath} does not exist`,
                    })
                    return
                }

                const terminal = yield* Terminal.Terminal

                yield* terminal.display(
                    `You are running fish. Would you like to install the op2env fish function to ${functionsPath}? [y/n] `,
                )
                const answer = yield* terminal.readLine

                if (answer !== 'y') {
                    yield* terminal.display('Installation aborted')
                    return
                }

                yield* Console.log(`Installing op2env fish function to ${functionsPath}`)
                yield* fs.copyFile(path.join(assetsPath, 'op2env.fish'), path.join(functionsPath, 'op2env.fish'))
            }),
    } satisfies IShell
})
