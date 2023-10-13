import { ExecutorContext, parseTargetString, runExecutor } from '@nx/devkit';

import { Op2envExecutorSchema } from './schema';

export default async function op2envExecutor(options: Op2envExecutorSchema, context: ExecutorContext) {
    console.log('Executor ran for Op2env', options);
    const { project, target, configuration } = parseTargetString(options.childTarget, context);

    process.env['QWERTZ'] = '1234qwer';

    for await (const _ of await runExecutor({ project, target, configuration }, {}, context)) {
        /* empty */
    }

    return {
        success: true,
    };
}
