import { Outlet } from "react-router-dom";
import { User, LogOut, Flame } from "lucide-react";
import { useAuthContext } from "../../contexts/AuthContext";
import { useWatchlistContext } from "../../contexts/WatchlistContext";
import { useModalContext } from "../../contexts/ModalContext";
import MovieDetailsModal from "../media/MovieDetailsModal";
import NavLinks from "./NavLinks";

/**
 * App shell for the authenticated area: sidebar, mobile chrome, and the
 * routed page in the middle. Also hosts the details modal so it can overlay
 * any page.
 */
const MainLayout = () => {
  const { user, handleLogout } = useAuthContext();
  const { watchlist, addToWatchlist, removeFromWatchlist } =
    useWatchlistContext();
  const { selectedMovie, openMedia, closeMedia } = useModalContext();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-black text-gray-100 font-sans overflow-hidden">
      <div className="md:hidden flex items-center justify-between p-4 bg-black border-b border-neutral-800 z-20 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-red-600 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-orange-900/20">
            <Flame size={20} fill="white" />
          </div>
          <span className="font-black text-lg tracking-tight">CineBlaze</span>
        </div>
        <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center text-white text-xs border border-neutral-700">
          {user.email?.[0].toUpperCase() || "G"}
        </div>
      </div>

      <aside className="hidden md:flex w-64 bg-black border-r border-neutral-800 flex-col flex-shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-red-600 to-orange-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-900/20 transform -rotate-3">
            <Flame size={24} fill="white" />
          </div>
          <span className="font-black text-xl tracking-tight text-white">
            CineBlaze
          </span>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-full flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform">
              {user.isAnonymous ? (
                <User size={20} />
              ) : (
                user.email?.[0].toUpperCase()
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">
                {user.isAnonymous ? "Guest User" : "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.email || "Anonymous"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-gray-500"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative scrollbar-thin bg-neutral-950">
        <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-full">
          <Outlet />
        </div>
      </main>

      <div className="md:hidden fixed bottom-0 w-full bg-black/90 backdrop-blur-lg border-t border-neutral-800 flex justify-around p-2 z-30 pb-safe">
        <NavLinks short />
      </div>

      {selectedMovie && (
        <MovieDetailsModal
          item={selectedMovie}
          onClose={closeMedia}
          onAddToWatchlist={addToWatchlist}
          onRemoveFromWatchlist={removeFromWatchlist}
          isInWatchlist={watchlist.some((i) => i.id === selectedMovie.id)}
          onExpand={openMedia}
        />
      )}
    </div>
  );
};

export default MainLayout;
