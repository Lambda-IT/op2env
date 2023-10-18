import { Chunk, Effect, Sink, Stream } from 'effect';

export const toString = <E>(stream: Stream.Stream<never, E, Uint8Array>) => {
    const decoder = new TextDecoder('utf-8');
    return Effect.map(Stream.run(stream, collectUint8Array), bytes => decoder.decode(bytes));
};

const collectUint8Array: Sink.Sink<never, never, Uint8Array, never, Uint8Array> = Sink.foldLeftChunks(
    new Uint8Array(),
    (bytes, chunk: Chunk.Chunk<Uint8Array>) =>
        Chunk.reduce(chunk, bytes, (acc, curr) => {
            const newArray = new Uint8Array(acc.length + curr.length);
            newArray.set(acc);
            newArray.set(curr, acc.length);
            return newArray;
        }),
);

export const toLines = <E>(stream: Stream.Stream<never, E, Uint8Array>) =>
    toString(stream).pipe(Effect.map(s => s.split('\n')));
