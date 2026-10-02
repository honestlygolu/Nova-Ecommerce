import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiError } from "../services/api";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOn, setIsOn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [ropeY, setRopeY] = useState(0);
  const [ropeX, setRopeX] = useState(0);
  const [wiggleElapsed, setWiggleElapsed] = useState(1000);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // --------------------------------------------------
  // PHYSICS STATE
  // --------------------------------------------------
  const physics = useRef({
    y: 0,
    x: 0,
  });

  const dragging = useRef(false);
  const pointerId = useRef(null);
  const isOnRef = useRef(false);
  const returnStartedAt = useRef(0);
  const returnStartY = useRef(0);
  const returnStartX = useRef(0);

  const dragStartY = useRef(0);
  const dragStartRopeY = useRef(0);

  const switchLocked = useRef(false);
  const lockTimer = useRef(null);

  const MAX_PULL = 145;
  const PULL_THRESHOLD = 65;
  const RETURN_DURATION = 1000;

  // --------------------------------------------------
  // ROPE PHYSICS LOOP
  // --------------------------------------------------
  useEffect(() => {
    let animationFrame;

    const animate = () => {
      const p = physics.current;

      if (!dragging.current) {
        const elapsed = returnStartedAt.current
          ? performance.now() - returnStartedAt.current
          : RETURN_DURATION;
        setWiggleElapsed(elapsed);
        const progress = Math.min(elapsed / RETURN_DURATION, 1);
        const remaining = 1 - progress;
        const easedReturn = 1 - progress * progress * (3 - 2 * progress);
        const softWobble =
          Math.sin(progress * Math.PI * 4) *
          Math.sin(progress * Math.PI);

        p.y = Math.max(
          0,
          Math.min(
            MAX_PULL,
            returnStartY.current * easedReturn +
              returnStartY.current * softWobble * 0.025
          )
        );
        p.x =
          returnStartX.current * easedReturn +
          Math.sin(progress * Math.PI * 3) * remaining * 3;

        if (progress >= 1) {
          p.y = 0;
          p.x = 0;
          returnStartedAt.current = 0;
        }
      }

      // Never let rope go above resting point
      p.y = Math.max(0, Math.min(MAX_PULL, p.y));

      setRopeY(p.y);
      setRopeX(p.x);

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);

      if (lockTimer.current) {
        clearTimeout(lockTimer.current);
      }
    };
  }, []);

  // --------------------------------------------------
  // RELEASE ROPE
  // --------------------------------------------------
  const releaseRope = (event) => {
    if (!dragging.current) return;

    dragging.current = false;
    pointerId.current = null;
    setIsDragging(false);

    // Release pointer capture safely
    try {
      const captureTarget =
        event?.currentTarget?.ownerSVGElement ?? event?.currentTarget;
      if (
        captureTarget?.hasPointerCapture?.(event.pointerId)
      ) {
        captureTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore pointer capture errors
    }

    const p = physics.current;

    // Did the user actually pull the cord?
    const pulledEnough = p.y >= PULL_THRESHOLD;

    if (pulledEnough && !switchLocked.current) {
      const turningOn = !isOnRef.current;
      isOnRef.current = turningOn;

      setIsOn(turningOn);

      // Lock interaction
      switchLocked.current = true;

      lockTimer.current = setTimeout(
        () => {
          switchLocked.current = false;
          lockTimer.current = null;
        },
        turningOn ? 2000 : 600
      );
    }

    returnStartY.current = p.y;
    returnStartX.current = p.x;
    returnStartedAt.current = performance.now();
  };

  // --------------------------------------------------
  // POINTER DOWN
  // --------------------------------------------------
  const handlePointerDown = (event) => {
    event.preventDefault();

    if (switchLocked.current) return;

    dragging.current = true;
    pointerId.current = event.pointerId;

    dragStartY.current = event.clientY;
    dragStartRopeY.current = physics.current.y;
    returnStartedAt.current = 0;
    setWiggleElapsed(0);

    setIsDragging(true);

    try {
      const captureTarget =
        event.currentTarget.ownerSVGElement ?? event.currentTarget;
      captureTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignore
    }
  };

  // --------------------------------------------------
  // POINTER MOVE
  // --------------------------------------------------
  const handlePointerMove = (event) => {
    if (!dragging.current) return;

    if (
      pointerId.current !== null &&
      event.pointerId !== pointerId.current
    ) {
      return;
    }

    const distance =
      event.clientY - dragStartY.current;

    const newY = Math.max(
      0,
      Math.min(
        MAX_PULL,
        dragStartRopeY.current + distance
      )
    );

    physics.current.y = newY;

    // While dragging, rope stays mostly vertical.
    physics.current.x *= 0.85;

    setRopeY(newY);
    setRopeX(physics.current.x);
  };

  // --------------------------------------------------
  // POINTER UP / CANCEL
  // --------------------------------------------------
  const handlePointerUp = (event) => {
    releaseRope(event);
  };

  const handlePointerCancel = (event) => {
    releaseRope(event);
  };

  // --------------------------------------------------
  // SAFETY: RELEASE IF BROWSER LOSES POINTER
  // --------------------------------------------------
  useEffect(() => {
    const forceRelease = () => {
      if (!dragging.current) return;

      dragging.current = false;
      pointerId.current = null;
      setIsDragging(false);

      returnStartY.current = physics.current.y;
      returnStartX.current = physics.current.x;
      returnStartedAt.current = performance.now();
    };

    window.addEventListener(
      "pointerup",
      forceRelease
    );

    window.addEventListener(
      "pointercancel",
      forceRelease
    );

    window.addEventListener(
      "blur",
      forceRelease
    );

    return () => {
      window.removeEventListener(
        "pointerup",
        forceRelease
      );

      window.removeEventListener(
        "pointercancel",
        forceRelease
      );

      window.removeEventListener(
        "blur",
        forceRelease
      );
    };
  }, []);

  // --------------------------------------------------
  // ROPE GEOMETRY
  // --------------------------------------------------
  const ropeLength = 145 + ropeY;

  const bendAmount = ropeX;

  const curveProgress = isDragging
    ? 1
    : Math.min(wiggleElapsed / RETURN_DURATION, 1);
  const curveAmplitude = 16 * (1 - curveProgress);
  const curvePhase = wiggleElapsed * 0.012;
  const controlOneX =
    bendAmount * 0.35 +
    Math.sin(curvePhase + Math.PI / 2) * curveAmplitude;
  const controlTwoX =
    bendAmount * 0.8 +
    Math.sin(curvePhase + (3 * Math.PI) / 2) * curveAmplitude;
  const ropePath = `
    M 0 0
    C
    ${controlOneX} ${ropeLength * 0.32},
    ${controlTwoX} ${ropeLength * 0.70},
    ${bendAmount} ${ropeLength}
  `;

  const submitLogin = async (event) => {
    event.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || "/account", { replace: true });
    } catch (error) {
      setFormError(getApiError(error, "We couldn't sign you in."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#08090a] text-white">
      {/* ==============================================
          BACKGROUND
      ============================================== */}

      <div className="pointer-events-none absolute inset-0">
        {/* subtle radial atmosphere */}
        <div
          className={`
            absolute
            left-[18%]
            top-[35%]
            h-[520px]
            w-[520px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            blur-[100px]
            transition-all
            duration-[1400ms]
            ${
              isOn
                ? "bg-amber-200/15 opacity-100"
                : "bg-transparent opacity-0"
            }
          `}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.025),transparent_65%)]" />
      </div>

      {/* ==============================================
          MAIN LAYOUT
      ============================================== */}

      <div className="relative z-10 mx-auto min-h-[1040px] w-full max-w-[1100px] lg:min-h-screen">
        {/* ============================================
            LEFT — LAMP
        ============================================ */}

        <section
          className="
            absolute
            left-1/2
            top-0
            h-[440px]
            w-[470px]
            -translate-x-1/2
            lg:left-[6%]
            lg:top-1/2
            lg:h-[310px]
            lg:translate-x-0
            lg:-translate-y-1/2
          "
        >
          <div className="origin-top scale-[0.68] sm:scale-[0.82] lg:scale-[0.8]">
          {/* -------------------------------
              LIGHT GLOW
          -------------------------------- */}

          <div
            className={`
              pointer-events-none
              absolute
              left-[45px]
              top-[35px]
              h-[340px]
              w-[380px]
              rounded-full
              blur-[95px]
              transition-all
              duration-[1800ms]
              ${
                isOn
                  ? "bg-amber-200/30 opacity-100"
                  : "bg-transparent opacity-0"
              }
            `}
          />

          {/* -------------------------------
              LAMP SHADE
          -------------------------------- */}

          <svg
            className="absolute left-[80px] top-[20px] h-[180px] w-[310px] overflow-visible"
            viewBox="0 0 310 180"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="nova-shade-off" x1="0" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stopColor="#f4e7cb" />
                <stop offset="46%" stopColor="#c3a16a" />
                <stop offset="100%" stopColor="#55432e" />
              </linearGradient>
              <linearGradient id="nova-shade-on" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff9e9" />
                <stop offset="62%" stopColor="#f4d99e" />
                <stop offset="100%" stopColor="#b47b39" />
              </linearGradient>
              <linearGradient id="nova-diffuser" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isOn ? "#fff8e5" : "#8c7757"} />
                <stop offset="100%" stopColor={isOn ? "#f5d58d" : "#4b3b27"} />
              </linearGradient>
            </defs>

            <path
              d="M103 8 C121 1 189 1 207 8 C224 14 234 25 241 41 L298 143 C305 156 298 165 284 168 C217 181 93 181 26 168 C12 165 5 156 12 143 L69 41 C76 25 86 14 103 8Z"
              fill={isOn ? "url(#nova-shade-on)" : "url(#nova-shade-off)"}
              stroke="#f8edda"
              strokeOpacity={isOn ? "0.8" : "0.42"}
              strokeWidth="1.5"
              style={{
                filter: isOn
                  ? "drop-shadow(0 18px 34px rgba(242, 190, 103, 0.36))"
                  : "drop-shadow(0 16px 22px rgba(0, 0, 0, 0.42))",
                transition: "filter 1.2s ease, stroke 1.2s ease",
              }}
            />

            <path
              d="M107 19 C132 11 178 11 202 19 C214 23 222 30 228 41"
              fill="none"
              stroke="white"
              strokeOpacity="0.38"
              strokeWidth="3"
              strokeLinecap="round"
            />

            <path
              d="M18 146 C79 160 231 160 292 146 L286 161 C220 175 90 175 24 161Z"
              fill="url(#nova-diffuser)"
              style={{ transition: "fill 1.2s ease" }}
            />
            <path
              d="M23 163 C88 176 222 176 287 163"
              fill="none"
              stroke="#f5d99f"
              strokeOpacity="0.72"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          {/* -------------------------------
              LAMP STEM
          -------------------------------- */}

          <div
            className={`
              absolute
              left-[228px]
              top-[185px]
              h-[150px]
              w-[14px]
              rounded-full
              bg-gradient-to-r
              from-[#51432f]
              via-[#f0d49b]
              to-[#80643d]
              shadow-[0_0_14px_rgba(0,0,0,0.4)]
            `}
          />

          <div className="absolute left-[216px] top-[323px] h-3 w-[38px] rounded-full border border-[#f4dfb5]/50 bg-gradient-to-b from-[#d7b778] to-[#604b2c] shadow-[0_5px_16px_rgba(0,0,0,0.5)]" />

          {/* -------------------------------
              LAMP BASE
          -------------------------------- */}

          <div
            className="
              absolute
              left-[115px]
              top-[332px]
              h-[30px]
              w-[240px]
              rounded-full
              border border-white/25
              bg-gradient-to-b
              from-[#e6d3ad]
              via-[#ab8953]
              to-[#50412e]
              shadow-[0_14px_36px_rgba(0,0,0,0.55)]
            "
          />

          <div className="absolute left-[145px] top-[357px] h-[10px] w-[180px] rounded-full bg-gradient-to-b from-[#8d7148] to-[#34291d] shadow-[0_9px_22px_rgba(0,0,0,0.6)]" />

          {/* ==================================
              PULL CORD
          ================================== */}

          <div
            className="
              absolute
              left-[340px]
              top-[180px]
              z-30
            "
          >
            <svg
              width="90"
              height={ropeLength + 50}
              viewBox={`0 0 90 ${ropeLength + 50}`}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onLostPointerCapture={handlePointerCancel}
              className={`overflow-visible touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            >
              {/* rope */}
              <path
                d={ropePath}
                fill="none"
                stroke="#aaa69c"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* tiny highlight */}
              <path
                d={ropePath}
                transform="translate(1 0)"
                fill="none"
                stroke="#e7e1d4"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.7"
              />

              {/* handle */}
              <circle
                cx={bendAmount}
                cy={ropeLength + 11}
                r="12"
                fill="#e8e2d5"
                className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
              />

              <circle
                cx={bendAmount - 3}
                cy={ropeLength + 8}
                r="5"
                fill="#ffffff"
                opacity="0.75"
              />

              <circle
                cx={bendAmount}
                cy={ropeLength + 11}
                r="28"
                fill="transparent"
                onPointerDown={handlePointerDown}
              />
            </svg>
          </div>

          {/* ==================================
              INSTRUCTION
          ================================== */}

          <div
            className={`
              absolute
              left-[145px]
              top-[385px]
              text-center
              transition-all
              duration-500
              ${
                isOn
                  ? "opacity-0"
                  : "opacity-100"
              }
            `}
          >
            <p className="text-sm tracking-wide text-white/60">
              Pull the cord
            </p>

            <p className="mt-1 text-xs text-white/25">
              to enter NOVA
            </p>
          </div>
          </div>
        </section>

        {/* ============================================
            RIGHT — LOGIN
        ============================================ */}

        <section
          className={`
            absolute
            left-1/2
            top-[510px]
            w-[90vw]
            max-w-[370px]
            -translate-x-1/2
            transition-all
            duration-700
            ease-out
            lg:left-[55%]
            lg:top-1/2
            lg:w-[370px]
            lg:translate-x-0
            lg:-translate-y-1/2
            ${
              isOn
                ? "translate-y-0 opacity-100 lg:translate-x-0"
                : "pointer-events-none translate-y-3 opacity-0 lg:translate-x-10"
            }
          `}
        >
          <div
            className="
              rounded-[24px]
              border
              border-white/10
              bg-[#151515]/95
              p-6
              shadow-[0_26px_80px_rgba(0,0,0,0.55)]
              backdrop-blur-2xl
            "
          >
            {/* Logo */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs tracking-[0.4em] text-white/45">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d9b979] shadow-[0_0_10px_rgba(217,185,121,0.5)]" />
                <span>NOVA</span>
              </div>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Welcome back.
              </h1>

              <p className="mt-2 text-sm text-white/40">
                Sign in to continue your journey.
              </p>
            </div>

            {/* FORM */}
            <form onSubmit={submitLogin} className="space-y-3">
              <div>
                <label htmlFor="login-email" className="mb-2 block text-xs text-white/45">
                  Email
                </label>

                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-white/10
                    bg-black/20
                    px-4
                    py-3
                    text-sm
                    text-white
                    outline-none
                    transition
                    placeholder:text-white/30
                    focus:border-[#d9b979]/60
                    focus:bg-black/30
                  "
                />
              </div>

              <div>
                <label htmlFor="login-password" className="mb-2 block text-xs text-white/45">
                  Password
                </label>

                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-white/10
                    bg-black/20
                    px-4
                    py-3
                    text-sm
                    text-white
                    outline-none
                    transition
                    placeholder:text-white/30
                    focus:border-[#d9b979]/60
                    focus:bg-black/30
                  "
                />
              </div>

              {formError && (
                <p role="alert" className="rounded-lg border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs text-rose-100">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="
                  mt-2
                  w-full
                  rounded-xl
                  bg-gradient-to-r from-[#f7f0e3] via-white to-[#eee0c3]
                  py-3
                  text-sm
                  font-semibold
                  text-black
                  transition
                  hover:bg-[#eee]
                  active:scale-[0.99]
                "
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-between text-xs text-white/40">
              <Link to="/forgot-password" className="transition hover:text-white/60">
                Forgot password?
              </Link>

              <Link to="/register" className="transition hover:text-white/60">
                Create account
              </Link>
            </div>

            <div className="mt-5 text-center text-[11px] tracking-wide text-white/30">
              Pull the cord again to switch off
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;
