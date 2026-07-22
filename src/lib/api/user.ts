import { api, unwrap } from "./client";
import type { User } from "@/types";

export type UpdateProfileInput = {
  full_name?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  locale?: string;
  avatar_url?: string | null;
};

export async function getCurrentUser(): Promise<User> {
  const res = await api.get("/user");
  return unwrap<User>(res);
}

export async function updateProfile(payload: UpdateProfileInput): Promise<User> {
  const res = await api.patch("/user/profile", payload);
  return unwrap<User>(res);
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}): Promise<{ message: string }> {
  const res = await api.patch("/user/password", payload);
  return unwrap<{ message: string }>(res);
}

/** Compress an image file to a small JPEG data URL for avatar storage. */
export function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file"));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("Image must be under 8MB"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
