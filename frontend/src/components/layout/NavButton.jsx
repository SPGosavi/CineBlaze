/** Sidebar / bottom-bar navigation button. `icon` is a lucide component. */
const NavButton = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex md:justify-start justify-center flex-col md:flex-row items-center gap-1 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-xl transition-all duration-200 font-medium ${active ? "md:bg-red-600/10 md:text-red-500 md:border md:border-red-600/20 text-red-500" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"}`}
  >
    <Icon size={24} className="md:w-5 md:h-5" strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] md:text-sm">{label}</span>
  </button>
);

export default NavButton;
