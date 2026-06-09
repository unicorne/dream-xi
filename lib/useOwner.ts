"use client";
import { useEffect, useState } from "react";

const KEY = "wcs-owner";

/** Stable anonymous id for this browser (no login). */
export function useOwner(): string {
  const [owner, setOwner] = useState("");
  useEffect(() => {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    setOwner(id);
  }, []);
  return owner;
}
