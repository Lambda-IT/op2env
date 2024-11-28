#!/usr/bin/env node

import { Args, Command, Options } from '@effect/cli'
import { FileSystem } from '@effect/platform'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Array, Console, Effect, Random, String, Tuple, pipe } from 'effect'

import * as Op from './Op.js'

const splitByFirstEqualSign = (s: string) => {
    const index = s.indexOf('=')
    if (index === -1) return Tuple.make(s, '')
    return Tuple.make(s.slice(0, index), s.slice(index + 1))
}

const getEntriesFromFile = (file: string) =>
    Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const contents = yield* fs.readFileString(file)
        return pipe(
            Array.filter(contents.split('\n'), String.isNonEmpty),
            Array.filter((s) => !s.startsWith('#')),
            Array.map(splitByFirstEqualSign),
            Array.filter(Tuple.isTupleOf(2)),
        )
    })

const extractInterpolatedVariables = (s: string) => {
    const matches = s.match(/\$\{([^}]+)\}/g)
    if (matches === null) return []
    return matches.map((m) => m.slice(2, m.length - 1))
}

const program = (files: string[], exprt: boolean) =>
    Effect.gen(function* () {
        const entries = yield* pipe(Array.map(files, getEntriesFromFile), Effect.all, Effect.map(Array.flatten))

        const id = yield* Random.nextInt
        const entriesWithInterpolatedVariables = pipe(
            entries,
            Array.map(([key, value]) => ({
                key,
                value,
                interpolatedVariables: Array.map(extractInterpolatedVariables(value), (variable, i) => ({
                    variable,
                    keyForVariable: `OP2ENV_${id}_${key}_${i}`,
                })),
            })),
            Array.map((a) => ({
                ...a,
                newValue: Array.reduce(a.interpolatedVariables, a.value, (acc, { variable, keyForVariable }) =>
                    acc.replace(`\${${variable}}`, `\${${keyForVariable}}`),
                ),
            })),
        )

        const interpolatedVariables = pipe(
            entriesWithInterpolatedVariables,
            Array.map((e) => e.interpolatedVariables),
            Array.flatten,
            Array.map((v) => Tuple.make(v.keyForVariable, v.variable)),
        )

        const [entriesWithSomeInterpolatedVariables, entriesWithNoInterpolatedVariables] = Array.partition(
            entriesWithInterpolatedVariables,
            (a) => a.interpolatedVariables.length === 0,
        )

        const environmentVariablesToFetch = pipe(
            interpolatedVariables,
            Array.appendAll(
                pipe(
                    entriesWithNoInterpolatedVariables,
                    Array.map(({ key, value }) => Tuple.make(key, value)),
                ),
            ),
        )

        const combinedContents = pipe(
            environmentVariablesToFetch,
            Array.map((e) => e.join('=')),
        ).join('\n')

        const fs = yield* FileSystem.FileSystem
        const tempFile = yield* fs.makeTempFileScoped()

        yield* fs.writeFileString(tempFile, combinedContents)

        const environmentVariablesNames = new Set(Array.map(environmentVariablesToFetch, ([key]) => key))

        const fetchedEnvironmentVariablesFiltered = yield* Op.fetchSecretsAndListAllEnvironmentVariables(tempFile).pipe(
            Effect.map((ss) =>
                pipe(
                    ss,
                    Array.map(splitByFirstEqualSign),
                    Array.filter((a) => {
                        if (a.length !== 2) return false
                        if (environmentVariablesNames.has(a[0])) return true
                        return false
                    }),
                    Array.map(([k, v]) => Tuple.make(k, v)),
                ),
            ),
        )

        const entriesWithNoInterpolatedVariablesKeys = new Set(
            Array.map(entriesWithNoInterpolatedVariables, ({ key }) => key),
        )
        const [environmentVariablesForInterpolation, environmentVariablesWithNoInterpolatedVariables] = pipe(
            fetchedEnvironmentVariablesFiltered,
            Array.partition(([key]) => entriesWithNoInterpolatedVariablesKeys.has(key)),
        )

        const environmentVariablesWithSomeInterpolatedVariables = pipe(
            entriesWithSomeInterpolatedVariables,
            Array.map(({ key, newValue }) =>
                Tuple.make(
                    key,
                    Array.reduce(environmentVariablesForInterpolation, newValue, (acc, a) =>
                        acc.replace(`$\{${a[0]}}`, a[1]),
                    ),
                ),
            ),
        )

        if (exprt) {
            const lines = pipe(
                environmentVariablesWithNoInterpolatedVariables,
                Array.appendAll(environmentVariablesWithSomeInterpolatedVariables),
                Array.map(([name, value]) => `export ${name}="${value}"`),
            ).join('\n')

            yield* Console.log(lines)
        } else {
            const environmentVariables = pipe(
                environmentVariablesWithNoInterpolatedVariables,
                Array.appendAll(environmentVariablesWithSomeInterpolatedVariables),
                Array.map((a) => a.join('=')),
            ).join('\n')

            yield* Console.log(environmentVariables)
        }
    }).pipe(Effect.scoped)

const command = Command.make(
    'op2env-print',
    { exprt: Options.boolean('export'), files: Args.repeated(Args.file()) },
    ({ files, exprt }) => program(files, exprt),
)

const cli = Command.run(command, { name: 'op2env-print', version: '0.0.2' })

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
