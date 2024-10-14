#!/usr/bin/env node

import { Args, Command } from '@effect/cli'
import { FileSystem } from '@effect/platform'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Array, Console, Effect, Order, String, Tuple, pipe } from 'effect'

import * as Op from './Op.js'

const getEntriesFromFile = (file: string) =>
    Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const contents = yield* fs.readFileString(file)
        return pipe(
            Array.filter(contents.split('\n'), String.isNonEmpty),
            Array.map((s) => s.split('=')),
            Array.filter(Tuple.isTupleOf(2)),
        )
    })

const program = (files: string[]) =>
    Effect.gen(function* () {
        const entries = yield* pipe(Array.map(files, getEntriesFromFile), Effect.all, Effect.map(Array.flatten))

        const environmentVariablesNames = new Set(Array.map(entries, (e) => e[0]))

        const environmentVariablesFiltered = yield* Op.fetchSecretsAndListAllEnvironmentVariables(files).pipe(
            Effect.map((ss) =>
                pipe(
                    Array.filter(ss, (s) => {
                        const t = s.split('=')
                        if (!Tuple.isTupleOf(2)(t)) return false
                        if (environmentVariablesNames.has(t[0])) return true
                        return false
                    }),
                    Array.sort(Order.string),
                ),
            ),
        )

        yield* Console.log(environmentVariablesFiltered.join('\n'))
    })

const command = Command.make('op2env-print', { files: Args.repeated(Args.file()) }, ({ files }) => program(files))

const cli = Command.run(command, { name: 'TODO', version: '0.0.0' })

Effect.suspend(() => cli(process.argv)).pipe(
    Effect.provide(NodeContext.layer),
    Effect.tapError((e) =>
        Effect.gen(function* () {
            if (e._tag === 'OpError') {
                yield* Console.error(e.message)
                yield* Console.error(e.error)
            } else {
                yield* Console.error(e)
            }
        }),
    ),
    NodeRuntime.runMain({ disableErrorReporting: true }),
)
