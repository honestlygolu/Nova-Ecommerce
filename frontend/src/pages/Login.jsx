import { useEffect, useRef, useState } from "react";

function Login() {
  const [isOn, setIsOn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [ropeY, setRopeY] = useState(0);
  const [ropeX, setRopeX] = useState(0);

  // --------------------------------------------------
  // PHYSICS STATE
  // --------------------------------------------------
  const physics = useRef({
    y: 0,
    velocityY: 0,
    x: 0,
    velocityX: 0,
  });

  const dragging = useRef(false);
  const pointerId = useRef(null);

  const dragStartY = useRef(0);
  const dragStartRopeY = useRef(0);

  const switchLocked = useRef(false);
  const lockTimer = useRef(null);

  const MAX_PULL = 145;
  const PULL_THRESHOLD = 65;

  // --------------------------------------------------
  // ROPE PHYSICS LOOP
  // --------------------------------------------------
  useEffect(() => {
    let animationFrame;

    const animate = () => {
      const p = physics.current;

      if (!dragging.current) {
        // -----------------------------
        // Vertical spring
        // -----------------------------
        const spring = 0.105;
        const damping = 0.84;

        p.velocityY += -p.y * spring;
        p.velocityY *= damping;
        p.y += p.velocityY;

        // -----------------------------
        // Tiny horizontal rope wobble
        // -----------------------------
        const wobbleSpring = 0.075;
        const wobbleDamping = 0.88;

        p.velocityX += -p.x * wobbleSpring;
        p.velocityX *= wobbleDamping;
        p.x += p.velocityX;

        // -----------------------------
        // Stop microscopic movement
        // -----------------------------
        if (
          Math.abs(p.y) < 0.05 &&
          Math.abs(p.velocityY) < 0.05
        ) {
          p.y = 0;
          p.velocityY = 0;
        }

        if (
          Math.abs(p.x) < 0.05 &&
          Math.abs(p.velocityX) < 0.05
        ) {
          p.x = 0;
          p.velocityX = 0;
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
      if (
        event?.currentTarget?.hasPointerCapture?.(
          event.pointerId
        )
      ) {
        event.currentTarget.releasePointerCapture(
          event.pointerId
        );
      }
    } catch {
      // Ignore pointer capture errors
    }

    const p = physics.current;

    // Did the user actually pull the cord?
    const pulledEnough = p.y >= PULL_THRESHOLD;

    if (pulledEnough && !switchLocked.current) {
      const turningOn = !isOn;

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

    // ------------------------------------------------
    // PHYSICAL SNAP BACK
    // ------------------------------------------------

    // Strong enough to visibly spring upward
    p.velocityY = -2.2;

    // Small natural sideways impulse
    p.velocityX =
      Math.random() > 0.5 ? 1.4 : -1.4;
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

    physics.current.velocityY = 0;
    physics.current.velocityX = 0;

    setIsDragging(true);

    try {
      event.currentTarget.setPointerCapture(
        event.pointerId
      );
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
    physics.current.velocityY = 0;

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

      physics.current.velocityY = -1.8;
      physics.current.velocityX =
        Math.random() > 0.5 ? 1 : -1;
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
  const ropeLength = 105 + ropeY;

  const bendAmount = ropeX;

  const controlOneX = bendAmount * 0.35;
  const controlTwoX = bendAmount * 0.8;

  return (
    <main className="min-h-screen overflow-hidden bg-[#08090a] text-white">
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

      <div className="relative z-10 min-h-screen">
        {/* ============================================
            LEFT — LAMP
        ============================================ */}

        <section
          className="
            absolute
            left-[7%]
            top-1/2
            h-[620px]
            w-[470px]
            -translate-y-1/2
          "
        >
          {/* -------------------------------
              LIGHT GLOW
          -------------------------------- */}

          <div
            className={`
              pointer-events-none
              absolute
              left-[48px]
              top-[45px]
              h-[430px]
              w-[370px]
              rounded-full
              blur-[80px]
              transition-all
              duration-1000
              ${
                isOn
                  ? "bg-amber-200/25 opacity-100"
                  : "bg-transparent opacity-0"
              }
            `}
          />

          {/* -------------------------------
              LAMP SHADE
          -------------------------------- */}

          <div
            className={`
              absolute
              left-[30px]
              top-[45px]
              h-[245px]
              w-[380px]
              rounded-t-[190px]
              rounded-b-[45px]
              transition-all
              duration-700
              ${
                isOn
                  ? `
                    bg-gradient-to-b
                    from-[#fffdf5]
                    via-[#fff8df]
                    to-[#d9cda9]
                    shadow-[0_30px_100px_rgba(255,215,140,0.55)]
                  `
                  : `
                    bg-gradient-to-b
                    from-[#e9e6dc]
                    via-[#cfcac0]
                    to-[#8e8a82]
                    shadow-[0_25px_80px_rgba(255,255,255,0.08)]
                  `
              }
            `}
          >
            {/* Shade inner light */}
            <div
              className={`
                absolute
                bottom-0
                left-1/2
                h-[25px]
                w-[310px]
                -translate-x-1/2
                rounded-full
                transition-all
                duration-700
                ${
                  isOn
                    ? "bg-[#fff4cc] shadow-[0_0_50px_rgba(255,225,150,0.9)]"
                    : "bg-[#77736c]"
                }
              `}
            />
          </div>

          {/* -------------------------------
              LAMP STEM
          -------------------------------- */}

          <div
            className={`
              absolute
              left-[210px]
              top-[285px]
              h-[125px]
              w-[13px]
              rounded-full
              bg-gradient-to-r
              from-[#716f6b]
              via-[#f1eee4]
              to-[#77746f]
            `}
          />

          {/* -------------------------------
              LAMP BASE
          -------------------------------- */}

          <div
            className="
              absolute
              left-[65px]
              top-[392px]
              h-[32px]
              w-[310px]
              rounded-full
              bg-gradient-to-b
              from-[#e8e4d9]
              to-[#77736d]
              shadow-[0_12px_35px_rgba(0,0,0,0.5)]
            "
          />

          {/* ==================================
              PULL CORD
          ================================== */}

          <div
            className="
              absolute
              left-[350px]
              top-[245px]
              z-30
            "
          >
            <svg
              width="90"
              height={ropeLength + 80}
              viewBox={`0 0 90 ${ropeLength + 80}`}
              className="overflow-visible"
            >
              {/* rope */}
              <path
                d={`
                  M 0 0
                  C
                  ${controlOneX} ${ropeLength * 0.32},
                  ${controlTwoX} ${ropeLength * 0.70},
                  ${bendAmount} ${ropeLength}
                `}
                fill="none"
                stroke="#aaa69c"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* tiny highlight */}
              <path
                d={`
                  M 1 0
                  C
                  ${controlOneX + 1} ${ropeLength * 0.32},
                  ${controlTwoX + 1} ${ropeLength * 0.70},
                  ${bendAmount + 1} ${ropeLength}
                `}
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
            </svg>

            {/* --------------------------------
                INVISIBLE DRAG TARGET
            -------------------------------- */}

            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              className="
                absolute
                left-1/2
                top-full
                h-20
                w-20
                -translate-x-1/2
                cursor-grab
                touch-none
                rounded-full
                active:cursor-grabbing
              "
            />
          </div>

          {/* ==================================
              INSTRUCTION
          ================================== */}

          <div
            className={`
              absolute
              left-[145px]
              top-[465px]
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
        </section>

        {/* ============================================
            RIGHT — LOGIN
        ============================================ */}

        <section
          className={`
            absolute
            left-[58%]
            top-1/2
            w-[390px]
            -translate-y-1/2
            transition-all
            duration-700
            ease-out
            ${
              isOn
                ? "translate-x-0 opacity-100"
                : "pointer-events-none translate-x-10 opacity-0"
            }
          `}
        >
          <div
            className="
              rounded-[28px]
              border
              border-white/10
              bg-white/[0.045]
              p-8
              shadow-[0_30px_100px_rgba(0,0,0,0.55)]
              backdrop-blur-2xl
            "
          >
            {/* Logo */}
            <div className="mb-8">
              <div className="text-xs tracking-[0.4em] text-white/35">
                NOVA
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Welcome back.
              </h1>

              <p className="mt-2 text-sm text-white/40">
                Sign in to continue your journey.
              </p>
            </div>

            {/* FORM */}
            <form
              onSubmit={(event) =>
                event.preventDefault()
              }
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-xs text-white/45">
                  Email
                </label>

                <input
                  type="email"
                  placeholder="you@example.com"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-white/10
                    bg-black/20
                    px-4
                    py-3.5
                    text-sm
                    text-white
                    outline-none
                    transition
                    placeholder:text-white/20
                    focus:border-white/25
                    focus:bg-black/30
                  "
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-white/45">
                  Password
                </label>

                <input
                  type="password"
                  placeholder="••••••••"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-white/10
                    bg-black/20
                    px-4
                    py-3.5
                    text-sm
                    text-white
                    outline-none
                    transition
                    placeholder:text-white/20
                    focus:border-white/25
                    focus:bg-black/30
                  "
                />
              </div>

              <button
                type="submit"
                className="
                  mt-2
                  w-full
                  rounded-xl
                  bg-white
                  py-3.5
                  text-sm
                  font-semibold
                  text-black
                  transition
                  hover:bg-[#eee]
                  active:scale-[0.99]
                "
              >
                Sign in
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between text-xs text-white/30">
              <button
                type="button"
                className="transition hover:text-white/60"
              >
                Forgot password?
              </button>

              <button
                type="button"
                className="transition hover:text-white/60"
              >
                Create account
              </button>
            </div>

            <div className="mt-7 text-center text-[11px] tracking-wide text-white/20">
              Pull the cord again to switch off
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;