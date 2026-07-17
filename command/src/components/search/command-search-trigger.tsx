"use client";

import { Search } from "lucide-react";

export function CommandSearchTrigger() {
  return (
    <button
      type="button"
      className="command-search"
      aria-label="Open command search"
      onClick={() => window.dispatchEvent(new Event("hand:command-search"))}
    >
      <Search aria-hidden />
      <span>Search</span>
      <kbd>⌘ K</kbd>
    </button>
  );
}
