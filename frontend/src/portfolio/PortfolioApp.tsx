import { useEffect } from "react";

import { About } from "./components/About";
import { Blog } from "./components/Blog";
import { Certifications } from "./components/Certifications";
import { Contact } from "./components/Contact";
import { Experience } from "./components/Experience";
import { Footer } from "./components/Footer";
import { FloatingChat } from "./components/FloatingChat";
import { Hero } from "./components/Hero";
import { Navbar } from "./components/Navbar";
import { Projects } from "./components/Projects";
import { Stack } from "./components/Stack";
import { StatusBar } from "./components/StatusBar";
import { profile } from "./data";
import "./portfolio.css";

/**
 * Generate a rounded favicon at runtime from profile.png.
 * SVG favicons that reference external <image href> are unreliable across browsers
 * (the photo often doesn't load when used as a favicon). Drawing on a canvas and
 * setting the favicon via data URL works in every modern browser.
 */
function applyRoundedFavicon(src: string): void {
  if (typeof document === "undefined") return;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.onload = () => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, 0, 0, size, size);
    let dataUrl: string;
    try {
      dataUrl = canvas.toDataURL("image/png");
    } catch {
      return; // tainted canvas (CORS) — keep static fallback
    }
    document
      .querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
      .forEach((link) => link.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.href = dataUrl;
    document.head.appendChild(link);
  };
  img.src = src;
}

export function PortfolioApp() {
  useEffect(() => {
    const previous = document.title;
    document.title = `${profile.shortName} — ${profile.title}`;
    document.body.classList.add("pf-body");
    applyRoundedFavicon(profile.photoPath);
    return () => {
      document.title = previous;
      document.body.classList.remove("pf-body");
    };
  }, []);

  return (
    <div className="pf-root">
      <Navbar />
      <main className="pf-main">
        <Hero />
        <About />
        <Experience />
        <Projects />
        <Stack />
        <Certifications />
        <Blog />
        <Contact />
      </main>
      <Footer />
      <StatusBar />
      <FloatingChat />
    </div>
  );
}
