import { AppPageShell } from "@/components/app-page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
  return (
    <AppPageShell
      title="Help"
      description="Quick answers to operate agents, automations and TUI sessions with confidence."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.3em] text-slate-400">
              Getting started
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 text-sm text-slate-300">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span>Create a session and select the agent.</span>
                <Badge variant="info">1 min</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span>Connect to the TUI terminal.</span>
                <Badge variant="info">Live</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span>Save global settings in Settings.</span>
                <Badge variant="info">Update</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.3em] text-slate-400">
              FAQ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 text-sm text-slate-300">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                How do I restart a container without losing context?
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                Where do I find detailed logs per session?
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                Can I change the active model per agent?
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Human support
          </CardTitle>
          <Badge variant="outline">Coming soon</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300">
            Coming soon: direct chat with the team, ticket creation and
            knowledge base with playbooks.
          </p>
        </CardContent>
      </Card>
    </AppPageShell>
  );
}
