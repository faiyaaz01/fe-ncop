import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { userSessionService } from "@/lib/user-session";
import lab from "@/assets/slide-lab.jpg";
import manufacturing from "@/assets/slide-manufacturing.jpg";
import capsules from "@/assets/slide-capsules.jpg";
import warehouse from "@/assets/slide-warehouse.jpg";

export const Route = createFileRoute("/index/login")({
  head: () => ({
    meta: [
      { title: "Sign in · NCOP Pharma ERP" },
      {
        name: "description",
        content:
          "Secure access to the NCOP pharmaceutical ERP: clients, catalogue, inquiries, orders and analytics.",
      },
      { property: "og:title", content: "Sign in · NCOP Pharma ERP" },
      {
        property: "og:description",
        content:
          "Secure access to the NCOP pharmaceutical ERP: clients, catalogue, inquiries, orders and analytics.",
      },
    ],
  }),
  component: LoginPage,
});

const slides = [
  { src: lab, caption: "Analytical R&D · Basel" },
  { src: manufacturing, caption: "Blister line · Clean room class C" },
  { src: capsules, caption: "Solid dosage portfolio" },
  { src: warehouse, caption: "GDP-certified distribution hub" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginPage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string | undefined;
    password?: string | undefined;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const active = slides[index] ?? slides[0]!;

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, []);

  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();

  const isFormValid =
    trimmedEmail.length > 0 && trimmedPassword.length > 0 && EMAIL_REGEX.test(trimmedEmail);

  const validateForm = () => {
    const nextErrors: { email?: string | undefined; password?: string | undefined } = {};

    if (!trimmedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!trimmedPassword) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleOnLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setApiError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:8080/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setApiError(data?.message ?? "Invalid email or password. Please try again.");
        return;
      }

      const userProfile = data?.user ?? data?.profile ?? data?.data ?? null;
      const authUser = {
        id: userProfile?.id ?? data?.id ?? `user-${trimmedEmail}`,
        email: data?.email ?? trimmedEmail,
        firstName: data?.firstName ?? userProfile?.firstName,
        lastName: data?.lastName ?? userProfile?.lastName,
        name:
          userProfile?.name ??
          ([data?.firstName, data?.lastName].filter(Boolean).join(" ") || trimmedEmail.split("@")[0]),
        role: userProfile?.role ?? data?.role ?? data?.userType ?? "User",
        roles: data?.roles ?? userProfile?.roles,
        userType: data?.userType ?? userProfile?.userType,
        avatar: userProfile?.avatar ?? data?.avatar ?? null,
        token: data?.token ?? null,
        refreshToken: data?.refresh_token ?? data?.refreshToken ?? null,
        expiresIn: data?.expiresIn ?? userProfile?.expiresIn ?? null,
        moduleRights: data?.moduleRights ?? userProfile?.moduleRights,
        lastLoginDate: data?.lastLoginDate ?? userProfile?.lastLoginDate,
        lastLoginDateUtcDateTimeFormatted:
          data?.lastLoginDateUtcDateTimeFormatted ?? userProfile?.lastLoginDateUtcDateTimeFormatted,
        lastLoginDateCurrentTimezoneDateFormatted:
          data?.lastLoginDateCurrentTimezoneDateFormatted ?? userProfile?.lastLoginDateCurrentTimezoneDateFormatted,
      };

      await userSessionService.login(authUser, {
        rememberMe: keepSignedIn,
        token: data?.token ?? null,
        refreshToken: data?.refresh_token ?? data?.refreshToken ?? null,
        expiresIn: data?.expiresIn ?? null,
      });

      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setApiError(err?.message || "Unable to reach the server. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const particles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: (i * 7.3) % 100,
        size: 90 + ((i * 37) % 160),
        delay: (i % 7) * 1.4,
        duration: 16 + (i % 5) * 4,
      })),
    [],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <AnimatePresence>
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <img
            src={active.src}
            alt={active.caption}
            width={1920}
            height={1088}
            className="kenburns size-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-[linear-gradient(115deg,oklch(0.18_0.04_262/0.88),oklch(0.18_0.04_262/0.55)_45%,oklch(0.2_0.05_240/0.75))]" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45vh] overflow-hidden">
        <div className="haze absolute inset-x-[-10%] bottom-[-12%] h-full" />
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute bottom-0 rounded-full bg-white/12 blur-2xl"
            style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.55 }}
            animate={{
              x: [0, 60, -30, 0],
              y: [0, -40, -10, 0],
              opacity: [0.15, 0.45, 0.2, 0.15],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-2.5 text-white">
          <div className="grid size-9 place-items-center rounded-xl bg-white/12 backdrop-blur-md ring-1 ring-white/20">
            <ShieldCheck className="size-4.5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold">NCOP</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/60">Pharma ERP</p>
          </div>
        </div>
        <div className="flex items-center gap-2 [&_button]:text-white [&_button:hover]:bg-white/10">
          <span className="hidden text-xs text-white/70 sm:inline">
            GxP-aligned · ISO 27001 hosting
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pb-20 pt-6 sm:px-8 lg:grid-cols-[1.05fr_minmax(380px,420px)] lg:gap-16 lg:pt-30">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl text-white"
        >
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ring-1 ring-white/15 backdrop-blur">
            Enterprise release 4.2
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
            The commercial backbone for pharmaceutical trade.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/75 sm:text-lg">
            Manage clients, product dossiers, RFQs and export orders in one validated workspace —
            with full traceability from first inquiry to final shipment.
          </p>

          <dl className="mt-9 grid max-w-lg grid-cols-3 gap-4">
            {[
              { k: "42", l: "Markets served" },
              { k: "1,280", l: "Registered SKUs" },
              { k: "99.98%", l: "Batch traceability" },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/12 backdrop-blur"
              >
                <dt className="text-xl font-bold">{s.k}</dt>
                <dd className="mt-0.5 text-[11px] uppercase tracking-wide text-white/60">{s.l}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex items-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.caption}
                onClick={() => setIndex(i)}
                aria-label={s.caption}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i === index ? "w-10 bg-white" : "w-5 bg-white/30 hover:bg-white/60",
                )}
              />
            ))}
            <span className="ml-3 text-[11px] text-white/55">{active.caption}</span>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="glass-dark w-full rounded-[18px] p-6 text-white sm:p-7"
        >
          <h2 className="text-xl font-bold">Welcome back</h2>
          <p className="mt-1 text-sm text-white/65">Sign in to your NCOP workspace.</p>

          <form
            className="mt-6 space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleOnLogin();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-white/70">
                Work email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  required
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  onBlur={() => {
                    if (!email.trim()) {
                      setErrors((prev) => ({ ...prev, email: "Email is required." }));
                    } else if (!EMAIL_REGEX.test(email.trim())) {
                      setErrors((prev) => ({
                        ...prev,
                        email: "Enter a valid email address.",
                      }));
                    }
                  }}
                  placeholder="you@company.com"
                  className="h-11 border-white/15 bg-white/10 pl-9 text-white placeholder:text-white/40 focus-visible:ring-white/40"
                />
              </div>
              {errors.email ? (
                <p id="email-error" className="text-xs text-rose-300">
                  {errors.email}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-white/70">
                Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  required
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  onBlur={() => {
                    if (!password.trim()) {
                      setErrors((prev) => ({ ...prev, password: "Password is required." }));
                    }
                  }}
                  placeholder="••••••••"
                  className="h-11 border-white/15 bg-white/10 pl-9 text-white placeholder:text-white/40 focus-visible:ring-white/40"
                />
              </div>
              {errors.password ? (
                <p id="password-error" className="text-xs text-rose-300">
                  {errors.password}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between text-xs text-white/60">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-3.5 accent-white"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                />
                Keep me signed in
              </label>
              <span className="cursor-pointer hover:text-white">Forgot password?</span>
            </div>

            {apiError ? (
              <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-400/30">
                {apiError}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="h-11 w-full bg-white text-slate-900 hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/70"
            >
              {isSubmitting ? "Signing in..." : "Login"}
              {!isSubmitting && <ArrowRight className="size-4" />}
            </Button>
          </form>
        </motion.section>
      </main>
    </div>
  );
}
