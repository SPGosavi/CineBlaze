import { Settings } from "lucide-react";
import { useAuthContext } from "../contexts/AuthContext";

const SettingsPage = () => {
  const { handleLogout } = useAuthContext();

  return (
    <div className="text-center py-20 text-gray-500">
      <Settings size={48} className="mx-auto mb-4 opacity-50" />
      <h2 className="text-xl font-bold text-gray-300">Settings</h2>
      <p>Preferences coming soon...</p>
      <button
        onClick={handleLogout}
        className="mt-4 text-red-400 text-sm md:hidden"
      >
        Logout
      </button>
    </div>
  );
};

export default SettingsPage;
