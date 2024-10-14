import { platform } from 'node:os'

import { NodeContext } from '@effect/platform-node'
import { Cause, Effect } from 'effect'

import { bash } from './bash.js'
import { fish } from './fish.js'

export class Shell extends Effect.Service<Shell>()('Shell', {
    effect: Effect.gen(function* () {
        if (platform() === 'win32') {
            yield* new Cause.UnknownException(null)
        } else {
            const shell = process.env.SHELL

            if (shell.endsWith('fish')) {
                return yield* fish
            }
            if (shell.endsWith('bash')) {
                return yield* bash
            }
        }
    }),
    dependencies: [NodeContext.layer],
}) {}
