import { Op2envExecutorSchema } from './schema';
import executor from './executor';

const options: Op2envExecutorSchema = {};

describe('Op2env Executor', () => {
    it('can run', async () => {
        const output = await executor(options);
        expect(output.success).toBe(true);
    });
});
