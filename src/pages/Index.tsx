import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTemplate, startBuild, makeTemplatePublic, getBuildStatus } from "@/lib/e2b-api";
import { Terminal, Cpu, MemoryStick, Clock, Globe, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Step = "idle" | "creating" | "building" | "making-public" | "polling" | "done" | "error";

const SPECS = [
  { icon: Cpu, label: "CPU Cores", value: "8 vCPUs" },
  { icon: MemoryStick, label: "Memory", value: "8,192 MB" },
  { icon: Clock, label: "Timeout", value: "3,600s (1hr)" },
  { icon: Globe, label: "Visibility", value: "Public" },
];

const Index = () => {
  const [apiKey, setApiKey] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [templateId, setTemplateId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your E2B API key");
      return;
    }

    setStep("creating");
    setErrorMsg("");
    setTemplateId("");

    try {
      // Step 1: Create template
      const template = await createTemplate(apiKey.trim());
      setTemplateId(template.templateID);

      // Step 2: Start build
      setStep("building");
      await startBuild(apiKey.trim(), template.templateID, template.buildID);

      // Step 3: Make public
      setStep("making-public");
      await makeTemplatePublic(apiKey.trim(), template.templateID);

      // Step 4: Poll build status until ready
      setStep("polling");
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 5000));
        const status = await getBuildStatus(apiKey.trim(), template.templateID);
        const latestBuild = status.builds?.[0];

        if (latestBuild?.status === "ready") {
          setStep("done");
          toast.success("Template created successfully!");
          return;
        }

        if (latestBuild?.status === "error") {
          throw new Error("Build failed. Check your E2B dashboard for details.");
        }

        attempts++;
      }

      // If we get here, build didn't complete but template was created
      setStep("done");
      toast.info("Template created! Build may still be in progress.");
    } catch (err: any) {
      setStep("error");
      const msg = err.message || "An unknown error occurred";
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(templateId);
    setCopied(true);
    toast.success("Template ID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const isLoading = ["creating", "building", "making-public", "polling"].includes(step);

  const getStatusText = () => {
    switch (step) {
      case "creating": return "Creating template...";
      case "building": return "Starting build...";
      case "making-public": return "Setting template to public...";
      case "polling": return "Waiting for build to complete...";
      default: return "";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="font-mono text-xs text-primary">E2B Template Creator</span>
          </div>
          <h1 className="text-3xl font-bold font-mono text-foreground text-glow">
            Create Sandbox Template
          </h1>
          <p className="text-sm text-muted-foreground">
            Provision a public E2B sandbox template with custom specs
          </p>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-3">
          {SPECS.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-lg border border-border bg-card p-3 space-y-1"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-mono">{label}</span>
              </div>
              <p className="text-sm font-mono font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            E2B API Key
          </label>
          <Input
            type="password"
            placeholder="e2b_***"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={isLoading}
            className="font-mono bg-card border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Create Button */}
        <Button
          onClick={handleCreate}
          disabled={isLoading || !apiKey.trim()}
          className="w-full font-mono font-semibold bg-primary text-primary-foreground hover:bg-primary/90 glow-primary disabled:opacity-50 disabled:shadow-none"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {getStatusText()}
            </span>
          ) : (
            "Create Template"
          )}
        </Button>

        {/* Status / Progress */}
        {isLoading && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-mono text-secondary-foreground">
                {getStatusText()}
              </span>
            </div>
            {templateId && (
              <p className="mt-2 text-xs font-mono text-muted-foreground">
                Template ID: {templateId}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm font-mono text-destructive">{errorMsg}</p>
          </div>
        )}

        {/* Success - Template ID */}
        {step === "done" && templateId && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-3 glow-primary">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-sm font-mono font-semibold text-primary text-glow">
                Template Created Successfully
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-card border border-border px-3 py-2 font-mono text-sm text-foreground select-all">
                {templateId}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0 border-border text-muted-foreground hover:text-primary hover:border-primary"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              This template is <span className="text-primary">public</span> — anyone can create sandboxes with this ID.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
