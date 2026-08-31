/** A frame ends at a blank line, in any of the line endings SSE permits. */
const FRAME_END = /\r\n\r\n|\n\n|\r\r/;
const LINE_END = /\r\n|\n|\r/;

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
    await reader.cancel().catch(() => {});
  }
}
