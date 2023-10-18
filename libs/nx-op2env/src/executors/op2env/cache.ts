import * as Fs from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import { Effect } from 'effect';

const _cacheParentDir = 'node_modules/.cache';
const _cacheDir = 'op2env';

const getCacheDir = Effect.gen(function* (_) {
    const fs = yield* _(Fs.FileSystem);
    const path = yield* _(Path.Path);
    if (!(yield* _(fs.exists(_cacheParentDir)))) {
        yield* _(fs.makeDirectory(_cacheParentDir));
    }
    const cacheDir = path.join(_cacheParentDir, _cacheDir);
    if (!(yield* _(fs.exists(cacheDir)))) {
        yield* _(fs.makeDirectory(cacheDir));
    }

    return cacheDir;
});
