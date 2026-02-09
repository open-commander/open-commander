import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { env } from "@/env";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitize a string for safe Docker container name suffix usage.
 */
export function normalizeContainerName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "-");
}

/**
 * Builds a deterministic container name for a terminal session.
 */
export function agentContainerName(sessionId: string) {
  return `${env.TTYD_CONTAINER_NAME}-${normalizeContainerName(sessionId)}`;
}

/**
 * Builds a deterministic container name for a ingress container.
 */
export function ingressContainerName(sessionId: string) {
  return `${agentContainerName(sessionId)}-ingress`;
}

/**
 * Builds a deterministic container name for a port proxy container.
 */
export function portProxyContainerName(
  sessionId: string,
  hostPort: number,
  containerPort: number,
) {
  return `${agentContainerName(sessionId)}-port-${hostPort}-${containerPort}`;
}

/**
 * @param sessionId - the terminal session ID.
 * @returns The agent container name and ingress container name.
 */
export function sessionContainerNames(sessionId: string) {
  return {
    agentContainer: agentContainerName(sessionId),
    ingressContainer: ingressContainerName(sessionId),
  };
}

export const escapeShellArg = (value: string) => {
  return `'${value.replace(/'/g, "'\\''")}'`;
};
