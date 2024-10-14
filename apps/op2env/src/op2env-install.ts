#!/usr/bin/env node

import { Command } from '@effect/cli'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Console, Effect } from 'effect'

import { Shell } from './shell/ShellService.js'

const program = (scriptPath: string) =>
    Effect.gen(function* () {
        const shell = yield* Shell
        yield* shell.install(scriptPath)
    })

const command = Command.make('op2env-install', {}, () => program(process.argv[1]))

const cli = Command.run(command, { name: 'TODO', version: '0.0.0' })

Effect.suspend(() => cli(process.argv)).pipe(
    Effect.provide([NodeContext.layer, Shell.Default]),
    Effect.tapError((e) =>
        Effect.gen(function* () {
            if (e._tag === 'InstallError') {
                yield* Console.error(e.message)
            } else {
                yield* Console.error(e)
            }
        }),
    ),
    NodeRuntime.runMain({ disableErrorReporting: true }),
)
