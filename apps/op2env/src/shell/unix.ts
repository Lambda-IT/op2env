import { FileSystem, Path } from '@effect/platform'
import { Effect } from 'effect'

export const printenv = () => 'printenv'

export const getAssetsPath = (scriptPath: string) =>
    Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const linkedScriptPath = yield* fs.realPath(scriptPath)
        const path = yield* Path.Path
        const dir = path.dirname(linkedScriptPath)
        return path.join(dir, 'assets')
    })
