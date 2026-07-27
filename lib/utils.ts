import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatFileSize } from "./formatSize"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export { formatFileSize }

