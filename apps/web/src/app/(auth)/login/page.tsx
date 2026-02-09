"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppBrandName } from "@/components/app-brand-name";
import { AppleIcon } from "@/components/icons/apple-icon";
import { GithubIcon } from "@/components/icons/github-icon";
import { GoogleIcon } from "@/components/icons/google-icon";
import Squares from "@/components/squares";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { env } from "@/env";
import { cn } from "@/lib/utils";
import { authClient } from "@/server/auth/client";
import type { AuthSocialProviders } from "@/types/auth";

const DEFAULT_NEXT_URL = "/dashboard";

interface SocialProvider {
  id: AuthSocialProviders;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const socialProviders: SocialProvider[] = [];

if (env.NEXT_PUBLIC_GITHUB_AUTH_ENABLED) {
  socialProviders.push({
    id: "github",
    label: "GitHub",
    icon: GithubIcon,
  });
}

if (env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED) {
  socialProviders.push({
    id: "google",
    label: "Gmail",
    icon: GoogleIcon,
  });
}

if (env.NEXT_PUBLIC_APPLE_AUTH_ENABLED) {
  socialProviders.push({
    id: "apple",
    label: "Apple",
    icon: AppleIcon,
  });
}

type SocialProviderId = (typeof socialProviders)[number]["id"];

type LoginStep = "email" | "otp";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isAuthDisabled = env.NEXT_PUBLIC_DISABLE_AUTH;
  const rawNextUrl = searchParams.get("nextUrl");
  const nextUrl = useMemo(() => {
    if (!rawNextUrl) return DEFAULT_NEXT_URL;
    if (rawNextUrl.startsWith("/")) return rawNextUrl;
    return DEFAULT_NEXT_URL;
  }, [rawNextUrl]);

  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [oauthLoadingProvider, setOauthLoadingProvider] =
    useState<SocialProviderId | null>(null);
  const [otpInvalidShake, setOtpInvalidShake] = useState(false);
  const otpInputRef = useRef<HTMLDivElement>(null);
  const oauthDisableTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    if (!isAuthDisabled) return;
    router.replace("/dashboard");
  }, [isAuthDisabled, router]);

  useEffect(() => {
    if (step !== "otp") return;
    const timer = window.setTimeout(() => {
      const input =
        otpInputRef.current?.querySelector<HTMLInputElement>(
          "[data-input-otp]",
        );
      input?.focus();
    }, 320);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    return () => {
      if (oauthDisableTimeoutRef.current) {
        clearTimeout(oauthDisableTimeoutRef.current);
      }
    };
  }, []);

  const handleSocialSignIn = async (provider: SocialProviderId) => {
    setError(null);
    setInfo(null);
    setOauthLoadingProvider(provider);
    if (oauthDisableTimeoutRef.current) {
      clearTimeout(oauthDisableTimeoutRef.current);
    }
    oauthDisableTimeoutRef.current = setTimeout(() => {
      setOauthLoadingProvider(null);
      oauthDisableTimeoutRef.current = null;
    }, 5000);

    const { error: signInError } = await authClient.signIn.social({
      provider,
      callbackURL: nextUrl,
      newUserCallbackURL: nextUrl,
    });

    if (signInError) {
      setError(signInError.message ?? "Unable to start social sign-in.");
    }
  };

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError("Enter a valid email to receive the code.");
      return;
    }

    setIsSending(true);
    setError(null);
    setInfo(null);

    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });

    setIsSending(false);

    if (sendError) {
      setError(sendError.message ?? "Unable to send the code.");
      return;
    }

    setStep("otp");
  };

  const handleResendOtp = async () => {
    if (!email.trim()) return;
    setIsResending(true);
    setError(null);
    setInfo(null);
    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    setIsResending(false);
    if (sendError) {
      setError(sendError.message ?? "Unable to resend the code.");
      return;
    }
    setInfo("We sent a new code to your email.");
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!otp.trim()) {
      setError("Enter the code from your email.");
      return;
    }

    setIsVerifying(true);
    setError(null);
    setInfo(null);

    const { error: verifyError } = await authClient.signIn.emailOtp({
      email,
      otp,
    });

    if (verifyError) {
      setIsVerifying(false);
      setOtpInvalidShake(true);
      requestAnimationFrame(() => {
        const input =
          otpInputRef.current?.querySelector<HTMLInputElement>("input");
        input?.focus();
        if (input) {
          const len = Math.min(otp.length, 6);
          input.setSelectionRange(len, len);
        }
      });
      return;
    }

    router.replace(nextUrl);
  };

  const handleEditEmail = () => {
    setStep("email");
    setOtp("");
    setError(null);
    setInfo(null);
    setOtpInvalidShake(false);
  };

  if (isAuthDisabled) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1220] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <Squares
          direction="diagonal"
          speed={0.4}
          squareSize={46}
          borderColor="rgba(148, 163, 184, 0.18)"
          hoverFillColor="rgba(30, 41, 59, 0.4)"
        />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        <Card className="w-full max-w-md min-h-1/3 border border-white/10 bg-(--oc-panel-strong) shadow-2xl">
          <CardContent className="gap-0 overflow-hidden p-0">
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{
                width: "200%",
                transform:
                  step === "otp" ? "translateX(-50%)" : "translateX(0)",
              }}
            >
              {/* Slide 1: Email entry */}
              <div className="flex w-1/2 shrink-0 flex-col px-6 pb-6 pt-6">
                <div className="mb-8 flex flex-col gap-3">
                  <AppBrandName className="text-center text-3xl" />
                  <CardDescription className="text-center text-sm text-slate-400">
                    Choose your path, commander.
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-6">
                  <div className="flex gap-3">
                    {socialProviders.map((provider) => {
                      const Icon = provider.icon;
                      const isLoading = oauthLoadingProvider === provider.id;
                      const isDisabled = oauthLoadingProvider !== null;
                      return (
                        <Button
                          key={provider.id}
                          type="button"
                          variant="outline"
                          disabled={isDisabled}
                          className="h-11 min-w-0 flex-1 justify-center gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-70"
                          onClick={() => handleSocialSignIn(provider.id)}
                        >
                          <span className="flex shrink-0 items-center justify-center">
                            {isLoading ? (
                              <Loader2
                                className="h-4 w-4 text-white animate-spin"
                                aria-hidden
                              />
                            ) : (
                              <Icon className="h-4 w-4 text-white" />
                            )}
                          </span>
                          <span className="truncate">{provider.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                  {socialProviders.length > 0 && (
                    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
                      <span className="h-px flex-1 bg-white/10" />
                      Or
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                  )}
                  <form className="grid gap-4" onSubmit={handleSendOtp}>
                    <div className="grid gap-2">
                      <input
                        id="login-email"
                        type="email"
                        name="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Your email address"
                        className={cn(
                          "w-full rounded-xl border border-white/10 bg-(--oc-panel) px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500",
                          "focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20",
                        )}
                        autoComplete="email"
                        data-1p-ignore
                        data-lpignore="true"
                        data-form-type="other"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="h-11 bg-emerald-500/90 text-white hover:bg-emerald-500"
                      disabled={isSending || !email.trim()}
                    >
                      {isSending ? "Sending code…" : "Send code"}
                    </Button>
                  </form>
                  {step === "email" && (error || info) && (
                    <div
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm",
                        error
                          ? "border-red-500/30 bg-red-500/10 text-red-200"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
                      )}
                    >
                      {error ?? info}
                    </div>
                  )}
                </div>
              </div>

              {/* Slide 2: OTP verification */}
              <div className="flex w-1/2 flex-col px-6 pb-6 pt-6 h-full">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-slate-400 hover:bg-white/10 hover:text-white"
                    onClick={handleEditEmail}
                    aria-label="Back to email"
                  >
                    <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                  </Button>
                </div>
                <div className="flex flex-col gap-6 px-2">
                  <form
                    className="flex flex-col gap-4 h-full"
                    onSubmit={handleVerifyOtp}
                  >
                    <div className="flex flex-col gap-4 grow">
                      <p className="text-sm text-slate-300 text-center items-center py-8">
                        We sent a 6-digit code to{" "}
                        <span className="font-medium text-white">{email}</span>.
                        Enter it below.
                      </p>
                      <div className="grid gap-2">
                        <div
                          ref={otpInputRef}
                          className={cn(
                            otpInvalidShake &&
                              "animate-[oc-shake_0.5s_ease-in-out]",
                          )}
                        >
                          <InputOTP
                            id="login-otp"
                            maxLength={6}
                            pattern={REGEXP_ONLY_DIGITS}
                            value={otp}
                            onChange={(value) => {
                              setOtpInvalidShake(false);
                              setOtp(value);
                            }}
                            autoComplete="one-time-code"
                            containerClassName="justify-center gap-1"
                            data-1p-ignore
                            data-lpignore="true"
                            data-form-type="other"
                            className="[&_[data-slot=input-otp-slot]]:rounded-lg [&_[data-slot=input-otp-slot]]:border [&_[data-slot=input-otp-slot]]:border-white/10 [&_[data-slot=input-otp-slot]]:bg-(--oc-panel) [&_[data-slot=input-otp-slot]]:text-white"
                          >
                            <InputOTPGroup
                              className={cn(
                                "*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl",
                                otpInvalidShake &&
                                  "rounded-lg [&>*]:border-red-500/50",
                              )}
                            >
                              <InputOTPSlot index={0} />
                            </InputOTPGroup>
                            <InputOTPGroup
                              className={cn(
                                "*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl",
                                otpInvalidShake &&
                                  "rounded-lg [&>*]:border-red-500/50",
                              )}
                            >
                              <InputOTPSlot index={1} />
                            </InputOTPGroup>
                            <InputOTPGroup
                              className={cn(
                                "*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl",
                                otpInvalidShake &&
                                  "rounded-lg [&>*]:border-red-500/50",
                              )}
                            >
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPGroup
                              className={cn(
                                "*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl",
                                otpInvalidShake &&
                                  "rounded-lg [&>*]:border-red-500/50",
                              )}
                            >
                              <InputOTPSlot index={3} />
                            </InputOTPGroup>
                            <InputOTPGroup
                              className={cn(
                                "*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl",
                                otpInvalidShake &&
                                  "rounded-lg [&>*]:border-red-500/50",
                              )}
                            >
                              <InputOTPSlot index={4} />
                            </InputOTPGroup>
                            <InputOTPGroup
                              className={cn(
                                "*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl",
                                otpInvalidShake &&
                                  "rounded-lg [&>*]:border-red-500/50",
                              )}
                            >
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="text-left text-sm text-emerald-400/50 hover:text-emerald-300"
                          onClick={handleResendOtp}
                          disabled={isResending}
                        >
                          {isResending ? "Sending…" : "Resend code"}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="h-11 gap-2 bg-emerald-500/90 text-white hover:bg-emerald-500"
                      disabled={isVerifying || !otp.trim() || otpInvalidShake}
                    >
                      {isVerifying ? (
                        <>
                          <Loader2
                            className="h-4 w-4 shrink-0 animate-spin"
                            aria-hidden
                          />
                          Verifying…
                        </>
                      ) : (
                        "Confirm"
                      )}
                    </Button>
                  </form>

                  {step === "otp" && (error || info) && (
                    <div
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm",
                        error
                          ? "border-red-500/30 bg-red-500/10 text-red-200"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
                      )}
                    >
                      {error ?? info}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
