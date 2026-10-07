import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react";
import {
  getTokenFromLoginResponse,
  useAdminLoginMutation,
} from "../redux/feature/auth/authApi";
import { useAppDispatch } from "../redux/hooks";
import { baseApi } from "../redux/baseApi";

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [remember, setRemember] = useState(false);
  const [adminLogin, { isLoading }] = useAdminLoginMutation();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    try {
      const response = await adminLogin({ email, password }).unwrap();
      const token = getTokenFromLoginResponse(response);

      if (!token) {
        setFormError("Login successful, but no token was returned.");
        return;
      }
      // Persist token: sessionStorage for current session, localStorage for "remember me"
      if (remember) {
        localStorage.setItem("accessToken", token);
        // 30 days expiry
        localStorage.setItem(
          "accessTokenExpiry",
          String(Date.now() + 30 * 24 * 60 * 60 * 1000)
        );
      } else {
        sessionStorage.setItem("accessToken", token);
      }
      // Reset the entire RTK Query cache before navigating.
      // This guarantees no stale /auth/me data from a previous session
      // (e.g. super admin → normal admin) bleeds into the new session.
      dispatch(baseApi.util.resetApiState());

      navigate("/", { replace: true });
    } catch (error) {
      const apiError = error as {
        data?: { message?: string };
        error?: string;
      };

      setFormError(
        apiError.data?.message ?? apiError.error ?? "Login failed. Try again."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-6 relative overflow-hidden font-inter">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-indigo/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-orange/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-[1200px] w-full grid grid-cols-1 lg:grid-cols-2 bg-[#111113] rounded-[48px] overflow-hidden border border-white/5 shadow-2xl relative z-10">
        <div className="p-16 lg:p-24 flex flex-col justify-between relative bg-gradient-to-br from-brand-indigo/20 via-transparent to-transparent">
          <div className="space-y-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-xl shadow-white/5">
                <img
                  src="/assets/backlyst-logo.png"
                  alt="Backlyst"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-3xl font-black font-sora lowercase tracking-tighter text-white">
                backlyst
              </span>
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl lg:text-70px] font-black font-sora text-white leading-[0.95] tracking-tight">
                Welcome to the <br />
                <span className="text-brand-indigo">Command</span> Center.
              </h1>
              <p className="text-lg text-white/40 font-medium max-w-md leading-relaxed">
                Backlyst ecosystem administration. Secure gateway for verified
                operators only.
              </p>
            </div>
          </div>

          <div className="pt-20">
            <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
              <Shield size={18} className="text-brand-indigo" />
              <span className="text-xs font-black text-white uppercase tracking-widest">
                Protected by Platform Security
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white p-12 lg:p-24 flex flex-col justify-center">
          <div className="max-w-[400px] mx-auto w-full space-y-10">
            <div className="space-y-2">
              <h2 className="text-3xl font-black font-sora text-gray-900 tracking-tight leading-none pt-1">
                Admin Entry
              </h2>
              <p className="text-sm text-gray-400 font-medium">
                Verify your administrative credentials.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Email Identifier
                </label>
                <div className="relative group">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-brand-indigo transition-colors"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@backlyst.io"
                    autoComplete="email"
                    required
                    className="w-full h-14 bg-gray-50 border-none rounded-2xl pl-12 pr-4 text-sm font-bold focus:ring-4 focus:ring-brand-indigo/5 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Security Key
                </label>
                <div className="relative group">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-brand-indigo transition-colors"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full h-14 bg-gray-50 border-none rounded-2xl pl-12 pr-14 text-sm font-bold focus:ring-4 focus:ring-brand-indigo/5 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={() => setRemember(!remember)}
                    className="w-5 h-5 rounded-lg border-2 border-gray-100 checked:bg-brand-indigo transition-all cursor-pointer"
                  />
                  <span className="text-xs font-bold text-gray-500 group-hover:text-gray-900">
                    Authorize for 30 days
                  </span>
                </label>
                <button
                  type="button"
                  className="text-xs font-black text-brand-indigo uppercase tracking-widest hover:text-brand-indigo-light"
                >
                  Recovery
                </button>
              </div>

              {formError && (
                <p className="text-xs font-bold text-red-500 uppercase tracking-wide">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-16 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-gray-900/20 transition-all flex items-center justify-center gap-3 group active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Authenticating" : "Initialize Login"}{" "}
                <ChevronRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </form>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                v2.4.0 OPERATOR
              </span>
              <div className="flex gap-4">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest cursor-pointer hover:text-gray-600">
                  Privacy
                </span>
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest cursor-pointer hover:text-gray-600">
                  Global Help
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
