import { useNavigate, useLocation } from "react-router-dom";
import { Search, List, Settings } from "lucide-react";
import NavButton from "./NavButton";

const NAV_ITEMS = [
  { to: "/", icon: Search, label: "Discover", shortLabel: "Discover" },
  {
    to: "/watchlist",
    icon: List,
    label: "My Watchlist",
    shortLabel: "Watchlist",
  },
  {
    to: "/settings",
    icon: Settings,
    label: "Settings",
    shortLabel: "Settings",
  },
];

/**
 * Navigation buttons shared by the desktop sidebar and the mobile bottom bar.
 *
 * Active state is derived from the URL rather than a local activeTab value,
 * so deep links and the browser back button stay in sync.
 */
const NavLinks = ({ short = false }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <>
      {NAV_ITEMS.map(({ to, icon, label, shortLabel }) => (
        <NavButton
          key={to}
          icon={icon}
          label={short ? shortLabel : label}
          active={pathname === to}
          onClick={() => navigate(to)}
        />
      ))}
    </>
  );
};

export default NavLinks;
