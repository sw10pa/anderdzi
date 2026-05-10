import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddr(a: string, head = 4, tail = 4) {
  if (a.length <= head + tail + 3) return a;
  return `${a.slice(0, head)}...${a.slice(-tail)}`;
}
