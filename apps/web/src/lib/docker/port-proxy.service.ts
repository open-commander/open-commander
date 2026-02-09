import { TRPCError } from "@trpc/server";
import { env } from "@/env";
import { portProxyContainerName } from "@/lib/utils";
import { dockerService } from "./docker.service";

const PORT_PROXY_IMAGE = "alpine/socat";
const PORT_PROXY_LABELS = {
  type: "oc.port-proxy",
  sessionId: "oc.sessionId",
  hostPort: "oc.hostPort",
  containerPort: "oc.containerPort",
} as const;

export type PortMapping = {
  hostPort: number;
  containerPort: number;
  containerName: string;
};

export type PortMappingSummary = {
  sessionId: string;
  hostPort: number;
  containerPort: number;
};

const buildLabels = (
  sessionId: string,
  hostPort: number,
  containerPort: number,
) => ({
  [PORT_PROXY_LABELS.type]: "true",
  [PORT_PROXY_LABELS.sessionId]: sessionId,
  [PORT_PROXY_LABELS.hostPort]: String(hostPort),
  [PORT_PROXY_LABELS.containerPort]: String(containerPort),
});

const parseMappingFromLabels = (
  containerName: string,
  labels: Record<string, string>,
): PortMapping | null => {
  const hostPort = Number(labels[PORT_PROXY_LABELS.hostPort]);
  const containerPort = Number(labels[PORT_PROXY_LABELS.containerPort]);
  if (!Number.isFinite(hostPort) || !Number.isFinite(containerPort)) {
    return null;
  }
  return { hostPort, containerPort, containerName };
};

const parseSummaryFromLabels = (
  labels: Record<string, string>,
): PortMappingSummary | null => {
  const sessionId = labels[PORT_PROXY_LABELS.sessionId];
  const hostPort = Number(labels[PORT_PROXY_LABELS.hostPort]);
  const containerPort = Number(labels[PORT_PROXY_LABELS.containerPort]);
  if (
    !sessionId ||
    !Number.isFinite(hostPort) ||
    !Number.isFinite(containerPort)
  ) {
    return null;
  }
  return { sessionId, hostPort, containerPort };
};

/**
 * Manages port proxy containers that expose ports from session containers.
 */
export const portProxyService = {
  /**
   * Lists active port mappings for a session.
   */
  async list(sessionId: string) {
    const containerNames = await dockerService.listContainersByLabels({
      [PORT_PROXY_LABELS.type]: "true",
      [PORT_PROXY_LABELS.sessionId]: sessionId,
    });
    const mappings = await Promise.all(
      containerNames.map(async (containerName) => {
        const labels = await dockerService.inspectLabels(containerName);
        return parseMappingFromLabels(containerName, labels);
      }),
    );
    return mappings.filter((mapping): mapping is PortMapping =>
      Boolean(mapping),
    );
  },

  /**
   * Lists all port mappings across sessions.
   */
  async listAll() {
    const containerNames = await dockerService.listContainersByLabels({
      [PORT_PROXY_LABELS.type]: "true",
    });
    const summaries = await Promise.all(
      containerNames.map(async (containerName) => {
        const labels = await dockerService.inspectLabels(containerName);
        return parseSummaryFromLabels(labels);
      }),
    );
    return summaries.filter((summary): summary is PortMappingSummary =>
      Boolean(summary),
    );
  },

  /**
   * Creates a port proxy container that forwards hostPort -> containerPort.
   */
  async add(
    sessionId: string,
    agentContainer: string,
    hostPort: number,
    containerPort: number,
  ) {
    const targetIp = await dockerService.getNetworkIp(
      agentContainer,
      env.TTYD_INTERNAL_NETWORK,
    );
    if (!targetIp) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to resolve session container IP.",
      });
    }

    await dockerService.ensureNetwork(env.TTYD_INTERNAL_NETWORK, {
      internal: true,
    });
    await dockerService.ensureNetwork(env.TTYD_INGRESS_NETWORK);

    const containerName = portProxyContainerName(
      sessionId,
      hostPort,
      containerPort,
    );
    const existing = await dockerService.isRunning(containerName);
    if (existing) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Port mapping already exists.",
      });
    }

    await dockerService.safeRemove(containerName);

    await dockerService.run({
      name: containerName,
      image: PORT_PROXY_IMAGE,
      network: env.TTYD_INGRESS_NETWORK,
      ports: [{ host: hostPort, container: containerPort }],
      labels: buildLabels(sessionId, hostPort, containerPort),
      args: [
        `tcp-listen:${containerPort},fork,reuseaddr`,
        `tcp:${targetIp}:${containerPort}`,
      ],
    });
    await dockerService.connectNetwork(
      containerName,
      env.TTYD_INTERNAL_NETWORK,
    );

    return { hostPort, containerPort, containerName };
  },

  /**
   * Removes a port proxy container for the given mapping.
   */
  async remove(sessionId: string, hostPort: number, containerPort: number) {
    const containerName = portProxyContainerName(
      sessionId,
      hostPort,
      containerPort,
    );
    await dockerService.safeRemove(containerName);
    return { removed: true };
  },

  /**
   * Removes all port proxy containers for the given session.
   */
  async removeAll(sessionId: string) {
    const containerNames = await dockerService.listContainersByLabels({
      [PORT_PROXY_LABELS.type]: "true",
      [PORT_PROXY_LABELS.sessionId]: sessionId,
    });
    await Promise.all(
      containerNames.map((containerName) =>
        dockerService.safeRemove(containerName),
      ),
    );
    return { removed: containerNames.length };
  },
};
