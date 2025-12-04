import { sse, type SSEResponse } from "@ademattos/bunbox";

export const GET = (): SSEResponse<{ token: string }> => {
  return sse(async function* () {
    const words = ["Hello", " ", "from", " ", "Bunbox", " ", "SSE", "!"];

    for (const word of words) {
      yield { token: word };
      await Bun.sleep(100); // Simulate delay
    }
  });
};
