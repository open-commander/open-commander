"use client";

import { Loader2, Network } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ApiClientsPanel } from "@/components/settings/api-clients-panel";
import { ModelPreferencesPanel } from "@/components/settings/model-preferences-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/use-page-title";
import { api } from "@/trpc/react";

type EgressEditModalProps = {
  open: boolean;
  title: string;
  description: string;
  value: string;
  isLoading: boolean;
  isSaving: boolean;
  onChange: (nextValue: string) => void;
  onClose: () => void;
  onSave: () => void;
};

/**
 * Modal for editing allowlist content in a large text area.
 */
function EgressEditModal({
  open,
  title,
  description,
  value,
  isLoading,
  isSaving,
  onChange,
  onClose,
  onSave,
}: EgressEditModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-white/10 bg-(--oc-panel-strong) p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {description}
            </p>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
          <Badge variant="muted">Live</Badge>
        </div>
        <div className="relative mt-6">
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Add entries, one per line."
            className="min-h-[280px] w-full rounded-2xl border border-white/10 bg-(--oc-panel) p-4 font-mono text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/70 text-slate-300">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading allowlist...
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="text-slate-300 hover:bg-white/10"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-emerald-500/90 text-white hover:bg-emerald-500"
            onClick={onSave}
            disabled={isLoading || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Settings page with agent preferences and egress allowlists.
 */
export default function SettingsPage() {
  usePageTitle("Settings");

  const [dnsModalOpen, setDnsModalOpen] = useState(false);
  const [ipsModalOpen, setIpsModalOpen] = useState(false);
  const [dnsContent, setDnsContent] = useState("");
  const [ipsContent, setIpsContent] = useState("");
  const dnsQuery = api.egress.getAllowedDomains.useQuery(undefined, {
    enabled: dnsModalOpen,
  });
  const ipsQuery = api.egress.getAllowedIps.useQuery(undefined, {
    enabled: ipsModalOpen,
  });
  const saveDnsMutation = api.egress.saveAllowedDomains.useMutation({
    onSuccess: () => setDnsModalOpen(false),
  });
  const saveIpsMutation = api.egress.saveAllowedIps.useMutation({
    onSuccess: () => setIpsModalOpen(false),
  });
  const dnsLoading = dnsQuery.isLoading || dnsQuery.isFetching;
  const ipsLoading = ipsQuery.isLoading || ipsQuery.isFetching;
  const dnsError = dnsQuery.error?.message ?? null;
  const ipsError = ipsQuery.error?.message ?? null;

  useEffect(() => {
    if (!dnsModalOpen) return;
    setDnsContent(dnsQuery.data?.content ?? "");
  }, [dnsModalOpen, dnsQuery.data]);

  useEffect(() => {
    if (!ipsModalOpen) return;
    setIpsContent(ipsQuery.data?.content ?? "");
  }, [ipsModalOpen, ipsQuery.data]);

  const dnsStatus = useMemo(
    () => (dnsError ? "Error" : dnsLoading ? "Loading" : "Ready"),
    [dnsError, dnsLoading],
  );
  const ipsStatus = useMemo(
    () => (ipsError ? "Error" : ipsLoading ? "Loading" : "Ready"),
    [ipsError, ipsLoading],
  );

  return (
    <div className="grid gap-4 z-10 lg:grid-cols-2 lg:auto-rows-fr">
      <ModelPreferencesPanel />
      <Card className="h-full border-white/10 bg-(--oc-panel-strong) shadow-lg">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Egress controls
          </CardTitle>
          <Badge variant="muted">Allowlists</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-(--oc-panel) p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                  <Network className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    DNS Allowlist
                  </p>
                  <p className="text-xs text-slate-400">One domain per line.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={dnsError ? "danger" : dnsLoading ? "info" : "muted"}
                >
                  {dnsStatus}
                </Badge>
                <Button
                  type="button"
                  className="bg-emerald-500/90 text-white hover:bg-emerald-500"
                  onClick={() => setDnsModalOpen(true)}
                >
                  Edit
                </Button>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-(--oc-panel) p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                  <Network className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    IPs Allowlist
                  </p>
                  <p className="text-xs text-slate-400">
                    One address or CIDR per line.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={ipsError ? "danger" : ipsLoading ? "info" : "muted"}
                >
                  {ipsStatus}
                </Badge>
                <Button
                  type="button"
                  className="bg-emerald-500/90 text-white hover:bg-emerald-500"
                  onClick={() => setIpsModalOpen(true)}
                >
                  Edit
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <EgressEditModal
        open={dnsModalOpen}
        title="Edit DNS allowlist"
        description="Domains"
        value={dnsContent}
        isLoading={dnsLoading}
        isSaving={saveDnsMutation.isPending}
        onChange={setDnsContent}
        onClose={() => setDnsModalOpen(false)}
        onSave={() => saveDnsMutation.mutate({ content: dnsContent })}
      />
      <EgressEditModal
        open={ipsModalOpen}
        title="Edit IP allowlist"
        description="Addresses"
        value={ipsContent}
        isLoading={ipsLoading}
        isSaving={saveIpsMutation.isPending}
        onChange={setIpsContent}
        onClose={() => setIpsModalOpen(false)}
        onSave={() => saveIpsMutation.mutate({ content: ipsContent })}
      />
      <ApiClientsPanel />
    </div>
  );
}
