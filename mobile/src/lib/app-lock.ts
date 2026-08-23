import * as LocalAuthentication from "expo-local-authentication";

export async function canUseDeviceLock(): Promise<{ ok: boolean; reason?: string }> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.NONE) {
      return {
        ok: false,
        reason:
          "Set a screen lock in system Settings first (PIN, pattern, password, fingerprint, or face).",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: "This device cannot use screen lock authentication.",
    };
  }
}

export async function promptDeviceLock(
  promptMessage = "Unlock Server Gallery"
): Promise<{ success: boolean; error?: string }> {
  const check = await canUseDeviceLock();
  if (!check.ok) {
    return { success: false, error: check.reason };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      promptSubtitle: "Use your device screen lock",
      promptDescription: "Fingerprint, face, PIN, pattern, or password",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
      requireConfirmation: false,
      biometricsSecurityLevel: "weak",
    });
    if (result.success) return { success: true };
    if (result.error === "user_cancel" || result.error === "system_cancel" || result.error === "app_cancel") {
      return { success: false, error: "cancelled" };
    }
    return { success: false, error: result.warning || result.error || "Authentication failed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return { success: false, error: message };
  }
}
