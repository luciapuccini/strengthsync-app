/**
 * Reads a `text/event-stream` response as a sequence of parsed `data`
 * payloads.
 *
 * Generic over the payload and ignorant of what it is carrying, so the next
 * endpoint that streams does not re-implement frame parsing. It is a reader,
 * not a validator: whatever the frame's JSON says is what the caller gets,
 * typed by the caller's own choice of `T`.
 *
 * `EventSource` would do this natively and is not usable here — the API takes
 * a bearer header and `EventSource` cannot send one — so the framing is parsed
 * by hand off `fetch`'s body.
 */

/** A frame ends at a blank line, in any of the line endings SSE permits. */
const FRAME_END = /\r\n\r\n|\n\n|\r\r/;
const LINE_END = /\r\n|\n|\r/;

/**
 * The `data` lines of one frame, joined as the spec requires. Comments
 * (`: ...`), `event`, `id` and `retry` lines are ignored: the payload carries
 * its own discriminator, so nothing here needs the frame's metadata.
 */
function frameData(frame: string): string | null {
  const lines = frame
    .split(LINE_END)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).replace(/^ /, ''));
  return lines.length > 0 ? lines.join('\n') : null;
}

export async function* readEventStream<T>(response: Response): AsyncGenerator<T> {
  if (!response.body) return;
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

  // Chunk boundaries have nothing to do with frame boundaries: a single frame
  // can arrive in pieces and several can arrive at once, so the tail of the
  // buffer is carried forward until its terminator shows up.
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      const frames = buffer.split(FRAME_END);
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const data = frameData(frame);
        if (data !== null) yield JSON.parse(data) as T;
      }
    }
  } finally {
    // A caller that stops iterating early — the generator's `return` path —
    // must not leave the body locked and the connection open.
    await reader.cancel().catch(() => {});
  }
}
