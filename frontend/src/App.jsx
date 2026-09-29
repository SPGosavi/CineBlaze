import React, { useState, useMemo } from 'react';

import { 
  Search, List, Settings, User, 
  AlertTriangle, Zap, Filter, 
  LogOut, Lock, Mail, 
  Flame
} from 'lucide-react';
import { firebaseInitialized } from './services/firebase';
import { sanitizeItem } from './utils/sanitize';
import { useAuth } from './hooks/useAuth';
import { useTrending } from './hooks/useTrending';
import { useSearch } from './hooks/useSearch';
import { useWatchlist } from './hooks/useWatchlist';
import GlobalStyles from './components/layout/GlobalStyles';
import NavButton from './components/layout/NavButton';
import TrendingSkeleton from './components/ui/Skeleton';
import MediaCard from './components/media/MediaCard';
import MovieDetailsModal from './components/media/MovieDetailsModal';
import GenreFilter from './components/watchlist/GenreFilter';
import KanbanColumn from './components/watchlist/KanbanColumn';
import TrendingRow from './components/trending/TrendingRow';

// --- VIEWS ---

const LoginView = ({ onLogin, onGuest, loading, error }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isDemo, setIsDemo] = useState(false);

    const toggleDemo = (e) => {
        setIsDemo(e.target.checked);
        if (e.target.checked) { setEmail('demo@moviefinder.com'); setPassword('demo1234'); }
        else { setEmail(''); setPassword(''); }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        onLogin(email, password, isDemo);
    }

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
                    <h1 className="text-2xl font-black text-white tracking-tight">CineBlaze</h1>
                    <p className="text-gray-400 mt-2 text-sm font-medium">Your personal cinema tracker awaits.</p>
                </div>
                <div className="p-8 space-y-6">
                    {error && <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm text-center flex items-center justify-center gap-2"><AlertTriangle size={16}/>{error}</div>}
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 text-gray-500" size={18} />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/50 text-white pl-10 p-3 rounded-xl border border-neutral-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all placeholder-gray-600" placeholder="name@example.com" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 text-gray-500" size={18} />
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/50 text-white pl-10 p-3 rounded-xl border border-neutral-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all placeholder-gray-600" placeholder="ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢" required />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="demo" checked={isDemo} onChange={toggleDemo} className="w-4 h-4 rounded border-neutral-600 bg-black text-red-600 focus:ring-red-500 focus:ring-offset-black" />
                            <label htmlFor="demo" className="text-sm text-gray-400 cursor-pointer select-none hover:text-gray-300">Use Demo Credentials</label>
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'Authenticating...' : 'Sign In'}</button>
                    </form>
                    <div className="relative flex items-center justify-center"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-800"></div></div><span className="relative bg-neutral-900 px-4 text-xs text-gray-500 uppercase font-semibold">Or</span></div>
                    <button onClick={onGuest} disabled={loading} className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-gray-300 font-bold py-3.5 rounded-xl transition-all hover:text-white flex items-center justify-center gap-2"><User size={18} /> Continue as Guest</button>
                </div>
            </div>
        </div>
    );
};

const DiscoverView = ({ searchQuery, setSearchQuery, handleSearch, isSearching, searchResults, trendingAll, trendingNetflix, trendingPrime, loadingTrending, loadingNetflix, loadingPrime, onAddToWatchlist, clearResults, onExpand, searchError }) => (
    <div className="space-y-10 animate-fade-in pb-24 md:pb-10">
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 border border-white/5 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/80 via-orange-900/60 to-black z-0"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-red-600/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg">
                Ignite your next <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">obsession.</span>
            </h1>
            <p className="text-gray-200 text-sm md:text-lg max-w-xl mx-auto font-medium opacity-90">Describe the plot, the vibe, or the scene stuck in your head. Our AI will handle the rest.</p>
            
            <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto group">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
                <div className="relative flex items-center">
                    <Search className="absolute left-4 text-gray-400 group-focus-within:text-red-400 transition-colors" size={20} />
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        placeholder="e.g. A noir detective movie set in 2049..." 
                        className="w-full bg-neutral-900/90 text-white p-4 pl-12 pr-24 rounded-2xl border border-white/10 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all outline-none shadow-xl text-base placeholder-gray-500" 
                    />
                    <button 
                        type="submit" 
                        disabled={isSearching} 
                        className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white px-5 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Find'}
                    </button>
                </div>
            </form>
            {searchError && (
                <div className={`px-4 py-3 rounded-xl text-sm font-medium inline-flex items-center gap-3 animate-fade-in shadow-lg border ${
                    searchError.includes("Limit") 
                        ? "bg-orange-500/10 border-orange-500/50 text-orange-400" 
                        : "bg-red-500/10 border-red-500/50 text-red-400"
                }`}>
                    <AlertTriangle size={18} /> 
                    {searchError}
                </div>
            )}
        </div>
      </div>

      {(isSearching || searchResults.length > 0) && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2"><h2 className="text-2xl font-bold text-white flex items-center gap-2"><Zap className="text-orange-500 fill-orange-500" size={20} /> Results</h2><button onClick={clearResults} className="text-sm text-gray-400 hover:text-white px-3 py-1 rounded-full hover:bg-white/10 transition-colors">Clear Results</button></div>
          {isSearching ? <div className="flex flex-col items-center justify-center py-20 gap-4"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div><p className="text-gray-500 animate-pulse font-medium">Scanning the archives...</p></div> : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">{searchResults.map(m => <MediaCard key={m.id} item={m} onAddToWatchlist={onAddToWatchlist} onExpand={onExpand} />)}</div>
          )}
        </div>
      )}

      {searchResults.length === 0 && !isSearching && (
        <div className="space-y-10">
            {loadingTrending
            ? <TrendingSkeleton />
            : <TrendingRow title="Trending Now" items={trendingAll} onAdd={onAddToWatchlist} onExpand={onExpand} />
            }

            {loadingNetflix
            ? <TrendingSkeleton />
            : <TrendingRow title="Popular on Netflix" items={trendingNetflix} onAdd={onAddToWatchlist} onExpand={onExpand} />
            }

            {loadingPrime
            ? <TrendingSkeleton />
            : <TrendingRow title="Popular on Prime Video" items={trendingPrime} onAdd={onAddToWatchlist} onExpand={onExpand} />
            }
        </div>
)}

    </div>
);

const WatchlistView = ({ watchlist, watchlistType, setWatchlistType, onDrop, onDragOver, onDragStart, firebaseInitialized, onExpand, onReorder }) => {
    const [filterGenre, setFilterGenre] = useState("All");

    const safeWatchlist = Array.isArray(watchlist) ? watchlist.filter(item => item && item.id).map(i => sanitizeItem(i)) : [];
    
    // Filter out duplicates (just in case DB has them)
    const uniqueWatchlist = Array.from(new Map(safeWatchlist.map(item => [item.id, item])).values());
    
    const typeFiltered = uniqueWatchlist.filter(i => i && (watchlistType === 'movie' ? i.media_type === 'movie' : i.media_type === 'tv'));
    
    const allGenres = useMemo(() => {
        const genres = new Set();
        typeFiltered.forEach(item => {
            if (Array.isArray(item.genres)) item.genres.forEach(g => genres.add(g));
        });
        return ["All", ...Array.from(genres).sort()];
    }, [typeFiltered]);

    // Must come after every hook call, otherwise the hook order changes
    // between renders and React throws.
    if (!firebaseInitialized) return <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400"><AlertTriangle size={48} className="mb-4 text-orange-500" /><h2 className="text-xl font-bold text-white mb-2">Feature Unavailable</h2><p>Add Firebase config to use Watchlist.</p></div>;
    
    const finalFiltered = filterGenre === "All" ? typeFiltered : typeFiltered.filter(i => Array.isArray(i.genres) && i.genres.includes(filterGenre));
    
    const want = finalFiltered.filter(i => i.status === 'want');
    const watching = finalFiltered.filter(i => i.status === 'watching');
    const watched = finalFiltered.filter(i => i.status === 'watched');

    return (
      <div className="h-full flex flex-col animate-fade-in pb-20 md:pb-0 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
          <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-black text-white tracking-tight">My Watchlist</h1>
              <div className="flex items-center gap-4">
                  <GenreFilter genres={allGenres} selected={filterGenre} onChange={setFilterGenre} />
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{finalFiltered.length} Titles</span>
              </div>
          </div>
          
          <div className="bg-black p-1.5 rounded-xl flex gap-1 w-full md:w-auto border border-neutral-800 shadow-inner">
            <button onClick={() => { setWatchlistType('movie'); setFilterGenre("All"); }} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${watchlistType === 'movie' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>Movies</button>
            <button onClick={() => { setWatchlistType('tv'); setFilterGenre("All"); }} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${watchlistType === 'tv' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>TV Series</button>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
          {watchlistType === 'tv' && (
            <KanbanColumn 
                title="Watching Now" 
                status="watching" 
                items={watching} 
                onDropColumn={onDrop} 
                onDragOver={onDragOver} 
                onDragStart={onDragStart} 
                onExpand={onExpand} 
                onDropItem={onReorder} 
            />
          )}
          <KanbanColumn 
              title="Want to Watch" 
              status="want" 
              items={want} 
              onDropColumn={onDrop} 
              onDragOver={onDragOver} 
              onDragStart={onDragStart} 
              onExpand={onExpand} 
              onDropItem={onReorder} 
          />
          <KanbanColumn 
              title="Watched" 
              status="watched" 
              items={watched} 
              onDropColumn={onDrop} 
              onDragOver={onDragOver} 
              onDragStart={onDragStart} 
              onExpand={onExpand} 
              onDropItem={onReorder}
          />
        </div>
      </div>
    );
};

const MainLayout = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('discover');
  const [watchlistType, setWatchlistType] = useState('movie');
  const [selectedMovie, setSelectedMovie] = useState(null);

  const {
    trendingAll,
    trendingNetflix,
    trendingPrime,
    loadingTrending,
    loadingNetflix,
    loadingPrime,
  } = useTrending();

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError,
    handleSearch,
    clearResults,
  } = useSearch();

  const {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    handleReorder,
    onDragStart,
    onDragOver,
    onDrop,
  } = useWatchlist(user);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-black text-gray-100 font-sans overflow-hidden">
      <GlobalStyles />
      <div className="md:hidden flex items-center justify-between p-4 bg-black border-b border-neutral-800 z-20 sticky top-0">
          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-tr from-red-600 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-orange-900/20"><Flame size={20} fill="white" /></div><span className="font-black text-lg tracking-tight">CineBlaze</span></div>
          <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center text-white text-xs border border-neutral-700">{user.email?.[0].toUpperCase() || "G"}</div>
      </div>
      <aside className="hidden md:flex w-64 bg-black border-r border-neutral-800 flex-col flex-shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-red-600 to-orange-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-900/20 transform -rotate-3"><Flame size={24} fill="white" /></div>
          <span className="font-black text-xl tracking-tight text-white">CineBlaze</span>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          <NavButton icon={Search} label="Discover" active={activeTab === 'discover'} onClick={() => setActiveTab('discover')} />
          <NavButton icon={List} label="My Watchlist" active={activeTab === 'watchlist'} onClick={() => setActiveTab('watchlist')} />
          <NavButton icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-full flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform">{user.isAnonymous ? <User size={20} /> : user.email?.[0].toUpperCase()}</div>
            <div className="flex-1 overflow-hidden"><p className="text-sm font-bold text-white truncate">{user.isAnonymous ? "Guest User" : "User"}</p><p className="text-xs text-gray-500 truncate">{user.email || "Anonymous"}</p></div>
            <button onClick={onLogout} className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-gray-500"><LogOut size={18} /></button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto relative scrollbar-thin bg-neutral-950">
        <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-full">
          {activeTab === 'discover' && 
            <DiscoverView 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleSearch={handleSearch}
            isSearching={isSearching}
            searchResults={searchResults}
            trendingAll={trendingAll}
            trendingNetflix={trendingNetflix}
            trendingPrime={trendingPrime}
            loadingTrending={loadingTrending}
            loadingNetflix={loadingNetflix}
            loadingPrime={loadingPrime}
            onAddToWatchlist={(i) => addToWatchlist(i, 'want')}
            clearResults={clearResults}
            onExpand={setSelectedMovie}
            searchError={searchError}/>
            }

          {activeTab === 'watchlist' && <WatchlistView watchlist={watchlist} watchlistType={watchlistType} setWatchlistType={setWatchlistType} onDrop={onDrop} onDragOver={onDragOver} onDragStart={onDragStart} firebaseInitialized={firebaseInitialized} onExpand={setSelectedMovie} onReorder={handleReorder} />}
          {activeTab === 'settings' && <div className="text-center py-20 text-gray-500"><Settings size={48} className="mx-auto mb-4 opacity-50" /><h2 className="text-xl font-bold text-gray-300">Settings</h2><p>Preferences coming soon...</p><button onClick={onLogout} className="mt-4 text-red-400 text-sm md:hidden">Logout</button></div>}
        </div>
      </main>
      <div className="md:hidden fixed bottom-0 w-full bg-black/90 backdrop-blur-lg border-t border-neutral-800 flex justify-around p-2 z-30 pb-safe">
          <NavButton icon={Search} label="Discover" active={activeTab === 'discover'} onClick={() => setActiveTab('discover')} />
          <NavButton icon={List} label="Watchlist" active={activeTab === 'watchlist'} onClick={() => setActiveTab('watchlist')} />
          <NavButton icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </div>
      {selectedMovie && <MovieDetailsModal item={selectedMovie} onClose={() => setSelectedMovie(null)} onAddToWatchlist={addToWatchlist} onRemoveFromWatchlist={removeFromWatchlist} isInWatchlist={watchlist.some(i => i.id === selectedMovie.id)} onExpand={setSelectedMovie} />}
    </div>
  );
};

export default function App() {
  const { user, loading, loginError, handleLogin, handleGuest, handleLogout } =
    useAuth();

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-red-600"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-current"></div></div>;

  if (!user) return <LoginView onLogin={handleLogin} onGuest={handleGuest} loading={loading} error={loginError} />;

  return <MainLayout user={user} onLogout={handleLogout} />;
}
