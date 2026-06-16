import { useEffect, useState } from "react";

import { NotFound } from "./components/NotFound";
import { JobsView } from "./jobs/JobsView";
import { PortfolioApp } from "./portfolio/PortfolioApp";

function normalize(pathname: string): string {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function Router() {
  const [pathname, setPathname] = useState<string>(() => normalize(window.location.pathname));

  useEffect(() => {
    const onPop = () => setPathname(normalize(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (pathname === "/" || pathname === "") {
    return <PortfolioApp />;
  }

  if (pathname === "/emplois") {
    return <JobsView />;
  }

  return <NotFound />;
}
