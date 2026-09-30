import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import login_bg from "../../assets/login_bg1.png";

import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  Bell,
  Users,
  MapPinIcon,
  ClipboardList,
} from "lucide-react";

const features = [
  {
    icon: Bell,
    title: "ALERTS",
    description: "Timely alerts and notifications",
  },
  {
    icon: Users,
    title: "COORDINATION",
    description: "Multi-agency collaboration",
  },
  {
    icon: MapPinIcon,
    title: "INVENTORY",
    description: "Real-time tracking and monitoring",
  },
  {
    icon: ClipboardList,
    title: "INCIDENT REPORTING",
    description: "Efficient allocation and tracking",
  },
];

function Login() {
  const navigate = useNavigate();
  const { login, loading, error: authError } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!userId || !password) {
      setFormError("Please fill in all fields.");
      return;
    }

    try {
      const loggedInUser = await login(userId, password);

      const role = getUserRole(loggedInUser);

      if (role === null) {
        navigate("/task", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setFormError(err?.message || "Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden font-sans text-slate-900">
      {/* Background image */}
      <img
        src={login_bg}
        alt="Disaster response"
        className="fixed inset-0 h-full w-full object-cover"
      />

      {/* Soft readability gradient */}
      <div className="fixed inset-0 bg-gradient-to-r from-slate-950/55 via-slate-950/25 to-slate-950/10" />

      {/* Subtle bottom gradient */}
      <div className="fixed inset-x-0 bottom-0 h-56 bg-gradient-to-t from-slate-950/60 to-transparent" />

      <div className="relative z-10 min-h-screen">
        <main className="grid min-h-screen lg:grid-cols-[65%_35%]">
          {/* =====================================================
              LEFT SIDE
          ===================================================== */}
          <section className="relative flex min-h-screen items-end">
            <div className="w-full px-6 pb-8 sm:px-10 lg:px-12 xl:px-16">
              {/* Text */}
              <div className="max-w-xl">
                <h1 className="text-2xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl xl:text-5xl">
                  Prepared for Emergencies.
                  <br />
                  <span className="text-blue-300 ">Ready to Respond.</span>
                </h1>

                <p className="mt-8  max-w-xl text-sm leading-6 text-white/80 xl:text-base">
                  A unified platform for disaster preparedness, emergency
                  response, relief coordination and recovery operations.
                </p>

                {/* Feature cards */}
                <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {features.map((feature) => {
                    const Icon = feature.icon;

                    return (
                      <div
                        key={feature.title}
                        className="
                          rounded-xl
                          border border-white/20
                          bg-white/[0.08]
                          p-2.5
                          backdrop-blur-sm
                          transition-all
                          duration-200
                          hover:-translate-y-0.5
                          hover:bg-white/[0.14]
                          hover:border-white/30
                        "
                      >
                        <div
                          className="
                            flex h-7 w-7
                            items-center justify-center
                            rounded-lg
                            border border-white/20
                            bg-white/10
                            text-white
                          "
                        >
                          <Icon size={14} />
                        </div>

                        <h3 className="mt-2 text-[10px] font-bold tracking-wider text-white">
                          {feature.title}
                        </h3>

                        <p className="mt-1 text-[10px] leading-snug text-white/65">
                          {feature.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              RIGHT SIDE
          ===================================================== */}
          <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-10 xl:px-16">
            <div className="w-full max-w-sm">
              {/* Login Card */}
              <div
                className="
                  rounded-2xl
                  border border-white/25
                  bg-black/50
                  p-5
                  shadow-2xl
                  shadow-black/25
                  backdrop-blur-md
                  transition-all
                  duration-300
                  hover:border-white/35
                  hover:bg-black/55
                  hover:shadow-blue-900/20
                  sm:p-6
                "
              >
                {/* Header */}
                <div className="text-center">
                  <div
                    className="
                      mx-auto mb-3
                      flex h-11 w-11
                      items-center justify-center
                      rounded-xl
                      border border-blue-300/20
                      bg-blue-600/80
                      shadow-lg
                      shadow-blue-900/30
                    "
                  >
                    <Lock className="text-white" size={20} />
                  </div>

                  <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                    Restricted Access
                  </h2>

                  <p className="mt-1 text-xs text-white/70">
                    Department Authorised Personnel
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="mt-6 space-y-4">
                  {/* Email */}
                  <div>
                    <label
                      className="
                        mb-1.5
                        block
                        text-[12px]
                        font-bold
                        uppercase
                        tracking-wide
                        text-white/85
                      "
                    >
                      Official Email
                    </label>

                    <div className="relative">
                      <User
                        size={15}
                        className="
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          text-white/50
                        "
                      />

                      <input
                        type="email"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="Enter your official email"
                        className="
                          w-full
                          rounded-lg
                          border border-white/20
                          bg-white/10
                          py-2.5
                          pl-9
                          pr-3
                          text-sm
                          text-white
                          placeholder:text-white/45
                          outline-none
                          transition-all
                          duration-200
                          hover:border-white/35
                          hover:bg-white/[0.13]
                          focus:border-blue-300/70
                          focus:bg-white/[0.14]
                          focus:ring-2
                          focus:ring-blue-300/20
                        "
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      className="
                        mb-1.5
                        block
                        text-[12px]
                        font-bold
                        uppercase
                        tracking-wide
                        text-white/85
                      "
                    >
                      Password
                    </label>

                    <div className="relative">
                      <Lock
                        size={15}
                        className="
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          text-white/50
                        "
                      />

                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="
                          w-full
                          rounded-lg
                          border border-white/20
                          bg-white/10
                          py-2.5
                          pl-9
                          pr-9
                          text-sm
                          text-white
                          placeholder:text-white/45
                          outline-none
                          transition-all
                          duration-200
                          hover:border-white/35
                          hover:bg-white/[0.13]
                          focus:border-blue-300/70
                          focus:bg-white/[0.14]
                          focus:ring-2
                          focus:ring-blue-300/20
                        "
                        autoComplete="current-password"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="
                          absolute
                          right-3
                          top-1/2
                          -translate-y-1/2
                          text-white/50
                          transition
                          hover:text-white
                        "
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={15} />
                        ) : (
                          <Eye size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {(formError || authError) && (
                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        rounded-lg
                        border
                        border-red-300/30
                        bg-red-500/15
                        px-3
                        py-2.5
                        text-[11px]
                        text-red-200
                      "
                    >
                      <span className="text-red-400">⚠</span>
                      {formError || authError}
                    </div>
                  )}

                  {/* Login */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="
                      mt-2
                      flex
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-lg
                      bg-blue-600/90
                      py-2.5
                      text-xs
                      font-semibold
                      text-white
                      shadow-lg
                      shadow-blue-900/30
                      transition-all
                      duration-200
                      hover:-translate-y-0.5
                      hover:bg-blue-500
                      hover:shadow-blue-900/50
                      active:translate-y-0
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  >
                    <LogIn size={16} />

                    {loading ? "SIGNING IN…" : "LOGIN"}
                  </button>
                </form>
              </div>

              {/* Security note */}
              <p className="mt-4 text-center text-[10px] font-medium text-white/60">
                Authorised personnel only • Secure department access
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Login;
