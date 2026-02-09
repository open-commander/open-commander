import { describe, expect, it } from "bun:test";
import { normalizeContainerName } from "../utils";

describe("normalizeContainerName", () => {
  it("replaces unsupported characters with dashes", () => {
    // given
    const input = "session id/with spaces&symbols!";

    // when
    const result = normalizeContainerName(input);

    // then
    expect(result).toBe("session-id-with-spaces-symbols-");
  });

  it("removes diacritics before normalizing", () => {
    // given
    const input = "sessão-ação-Über";

    // when
    const result = normalizeContainerName(input);

    // then
    expect(result).toBe("sessao-acao-Uber");
  });

  it("preserves allowed characters", () => {
    // given
    const input = "alpha.NUM_123-ok";

    // when
    const result = normalizeContainerName(input);

    // then
    expect(result).toBe("alpha.NUM_123-ok");
  });
});
