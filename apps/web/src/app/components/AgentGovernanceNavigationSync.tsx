"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import styles from "./AgentGovernanceNavigationSync.module.css";

const HEADER_OFFSET = 170;

export default function AgentGovernanceNavigationSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname?.startsWith("/agent-governance")) return;

    const nav = document.querySelector('nav[aria-label="Agent Governance"]');
    if (!nav) return;

    const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    if (!links.length) return;

    const setActive = (href: string) => {
      links.forEach((link) => {
        const selected = link.getAttribute("href") === href;
        link.classList.toggle(styles.activeNav, selected);
        link.classList.toggle(styles.inactiveNav, !selected);
        if (selected) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };

    const initial = window.location.hash && links.some((link) => link.getAttribute("href") === window.location.hash)
      ? window.location.hash
      : "#summary";
    setActive(initial);

    const cleanups = links.map((link) => {
      const onClick = (event: MouseEvent) => {
        const href = link.getAttribute("href");
        if (!href) return;
        const target = document.querySelector<HTMLElement>(href);
        if (!target) return;

        event.preventDefault();
        setActive(href);
        window.history.replaceState(null, "", href);

        const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      };

      link.addEventListener("click", onClick);
      return () => link.removeEventListener("click", onClick);
    });

    const onHashChange = () => {
      if (window.location.hash) setActive(window.location.hash);
    };
    window.addEventListener("hashchange", onHashChange);

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      window.removeEventListener("hashchange", onHashChange);
      links.forEach((link) => {
        link.classList.remove(styles.activeNav, styles.inactiveNav);
        link.removeAttribute("aria-current");
      });
    };
  }, [pathname]);

  return null;
}
