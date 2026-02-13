import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@/redux/authSlice";
import { ROUTES } from "@/utils/constants";

const navItems = [
  { label: "Home", to: ROUTES.home },
  { label: "Services", to: "/?section=services" },
];

function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const userLabel = useMemo(() => {
    if (!isAuthenticated) return "";
    if (user?.name) return user.name;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  }, [isAuthenticated, user]);

  const closeMenu = () => setIsMenuOpen(false);

  const onLogout = () => {
    dispatch(logout());
    closeMenu();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          to={ROUTES.home}
          onClick={closeMenu}
          className="text-lg font-semibold tracking-tight"
        >
          Resume IQ
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className="text-sm hover:text-primary">
              {item.label}
            </Link>
          ))}

          {isAuthenticated ? (
            <>
              {/* ❌ border removed */}
              <span className="text-sm font-medium">{userLabel}</span>

              <button onClick={onLogout} className="btn-ui btn-ui-secondary text-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to={ROUTES.login} className="btn-ui btn-ui-secondary text-sm">
                Login
              </Link>
              <Link to={ROUTES.register} className="btn-ui btn-ui-primary text-sm">
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="md:hidden rounded-xl border border-border p-2"
        >
          ☰
        </button>
      </div>

      {/* ✅ Mobile Drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition ${
          isMenuOpen ? "visible" : "invisible"
        }`}
      >
        {/* Overlay */}
        <div
          onClick={closeMenu}
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            isMenuOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Drawer */}
     <div
  className={`absolute left-0 top-0 min-h-screen h-full w-[75%] max-w-[320px]
  bg-white dark:bg-background
  p-5 shadow-2xl
  transform transition-transform duration-300
  ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
>

          <h2 className="mb-6 text-lg font-semibold">Menu</h2>

          <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={closeMenu}
                className="rounded-lg px-3 py-2 text-sm hover:bg-accent"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 border-t pt-4">
            {isAuthenticated ? (
              <>
                {/* ❌ border removed */}
                <p className="mb-3 text-sm font-medium">{userLabel}</p>

                <button
                  onClick={onLogout}
                  className="btn-ui btn-ui-secondary w-full"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link
                  to={ROUTES.login}
                  onClick={closeMenu}
                  className="btn-ui btn-ui-secondary w-full text-center"
                >
                  Login
                </Link>
                <Link
                  to={ROUTES.register}
                  onClick={closeMenu}
                  className="btn-ui btn-ui-primary w-full text-center"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
