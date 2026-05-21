import { useEffect, useState } from "react";

import { RagApp } from "./apps/RagApp";
import { NotFound } from "./components/NotFound";

function isHomePath(pathname: string): boolean {
  return pathname === "/" || pathname === "";
}

export function Router() {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return isHomePath(pathname) ? <RagApp /> : <NotFound />;
}
