import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { DockerMountMode } from "../docker.types";

type ExecFileCall = {
  file: string;
  args: string[];
  options: { timeout?: number };
};

const createExecFileMock = () => {
  const calls: ExecFileCall[] = [];
  const execFile = (
    file: string,
    args: string[],
    options: { timeout?: number },
    callback: (
      error: Error | null,
      result?: { stdout: string; stderr: string },
    ) => void,
  ) => {
    calls.push({ file, args, options });
    callback(null, { stdout: "", stderr: "" });
  };
  return { execFile, calls };
};

describe("dockerService", () => {
  let calls: ExecFileCall[] = [];

  const loadService = async () =>
    (await import(`../docker.service?test=${Date.now()}${Math.random()}`))
      .dockerService;

  beforeEach(() => {
    const mockExec = createExecFileMock();
    calls = mockExec.calls;
    mock.module("node:child_process", () => ({
      execFile: mockExec.execFile,
    }));
  });

  afterEach(() => {
    mock.restore();
  });

  it("builds docker run args with ports, env, mounts, and args", async () => {
    // given
    const dockerService = await loadService();
    const options = {
      name: "open-commander-ttyd-123",
      image: "opencommander/core:latest",
      ports: [
        { host: "auto" as const, container: 7681 },
        { host: 3001, container: 3000 },
      ],
      env: {
        POWERLEVEL9K_DISABLE_GITSTATUS: "true",
        COMMANDER_ENV_NODE_VERSION: "20",
      },
      mounts: [
        {
          source: "/tmp/claude/.claude.json",
          target: "/home/commander/.claude.json",
        },
        {
          source: "/tmp/claude/.claude",
          target: "/home/commander/.claude",
          mode: DockerMountMode.ReadOnly,
        },
      ],
      args: ["ttyd", "-W", "-p", "7681", "zsh"],
    };

    // when
    await dockerService.run(options);

    // then
    expect(calls).toHaveLength(1);
    expect(calls[0].file).toBe("docker");
    expect(calls[0].args).toEqual([
      "run",
      "-d",
      "--name",
      "open-commander-ttyd-123",
      "-p",
      "0:7681",
      "-p",
      "3001:3000",
      "-e",
      "POWERLEVEL9K_DISABLE_GITSTATUS=true",
      "-e",
      "COMMANDER_ENV_NODE_VERSION=20",
      "-v",
      "/tmp/claude/.claude.json:/home/commander/.claude.json:rw",
      "-v",
      "/tmp/claude/.claude:/home/commander/.claude:ro",
      "opencommander/core:latest",
      "ttyd",
      "-W",
      "-p",
      "7681",
      "zsh",
    ]);
  });

  it("omits -d when detach is false", async () => {
    // given
    const dockerService = await loadService();

    // when
    await dockerService.run({
      name: "no-detach",
      image: "agent",
      detach: false,
    });

    // then
    expect(calls).toHaveLength(1);
    expect(calls[0].args.slice(0, 3)).toEqual(["run", "--name", "no-detach"]);
  });

  it("builds restart/start/remove commands", async () => {
    // given
    const dockerService = await loadService();

    // when
    await dockerService.restart("container-1");
    await dockerService.start("container-2");
    await dockerService.remove("container-3");

    // then
    expect(calls).toHaveLength(3);
    expect(calls[0].args).toEqual(["restart", "container-1"]);
    expect(calls[1].args).toEqual(["start", "container-2"]);
    expect(calls[2].args).toEqual(["rm", "-f", "container-3"]);
  });
});
