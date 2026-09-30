import { useState } from "react";
import { Navigate } from "react-router-dom";
import { AlertTriangle, Mail, Lock, User, Flame } from "lucide-react";
import { useAuthContext } from "../contexts/AuthContext";
import FullPageSpinner from "../components/ui/FullPageSpinner";

const LoginPage = () => {
  const { user, loading, loginError, handleLogin, handleGuest } =
    useAuthContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isDemo, setIsDemo] = useState(false);

  const toggleDemo = (e) => {
    setIsDemo(e.target.checked);
    if (e.target.checked) {
      setEmail("demo@moviefinder.com");
      setPassword("demo1234");
    } else {
      setEmail("");
      setPassword("");
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleLogin(email, password, isDemo);
  };

  // Wait for the initial auth check so an already-signed-in user is not
  // shown the form for a frame before being redirected.
  if (loading && !loginError) return <FullPageSpinner />;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-gray-100 p-4 font-sans relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black pointer-events-none"></div>

      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden relative z-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-600"></div>
        <div className="p-8 pb-0 text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-red-600 to-orange-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl mx-auto mb-4 shadow-lg shadow-orange-900/20 transform -rotate-3">
            <Flame size={32} fill="white" className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            CineBlaze
          </h1>
          <p className="text-gray-400 mt-2 text-sm font-medium">
            Your personal cinema tracker awaits.
          </p>
        </div>
        <div className="p-8 space-y-6">
          {loginError && (
            <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm text-center flex items-center justify-center gap-2">
              <AlertTriangle size={16} />
              {loginError}
            </div>
          )}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-3.5 text-gray-500"
                  size={18}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/50 text-white pl-10 p-3 rounded-xl border border-neutral-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all placeholder-gray-600"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-3.5 text-gray-500"
                  size={18}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/50 text-white pl-10 p-3 rounded-xl border border-neutral-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all placeholder-gray-600"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="demo"
                checked={isDemo}
                onChange={toggleDemo}
                className="w-4 h-4 rounded border-neutral-600 bg-black text-red-600 focus:ring-red-500 focus:ring-offset-black"
              />
              <label
                htmlFor="demo"
                className="text-sm text-gray-400 cursor-pointer select-none hover:text-gray-300"
              >
                Use Demo Credentials
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800"></div>
            </div>
            <span className="relative bg-neutral-900 px-4 text-xs text-gray-500 uppercase font-semibold">
              Or
            </span>
          </div>
          <button
            onClick={handleGuest}
            disabled={loading}
            className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-gray-300 font-bold py-3.5 rounded-xl transition-all hover:text-white flex items-center justify-center gap-2"
          >
            <User size={18} /> Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
