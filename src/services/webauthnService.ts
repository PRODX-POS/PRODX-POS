/**
 * WebAuthn capability and server-boundary contract.
 *
 * The browser must not treat a locally stored credential or a locally generated
 * WebAuthn assertion as an authenticated identity. Registration and assertion
 * verification require a server endpoint that validates the challenge,
 * credential, origin/RP ID, user binding, and authenticator counter.
 */

export interface PasskeyCredentialRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: 'cashier' | 'manager' | 'admin';
  deviceLabel: string;
  authenticatorType: 'touch_id' | 'face_id' | 'windows_hello' | 'android_biometric' | 'security_key' | 'virtual_biometric';
  createdAt: string;
  lastUsedAt?: string;
  counter: number;
  isVirtualFallback?: boolean;
}

export interface WebAuthnCapability {
  isSupported: boolean;
  hasPlatformAuthenticator: boolean;
  isConditionalMediationAvailable: boolean;
  biometricLabel: string;
  platformSummary: string;
}

export function bufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64URLToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function detectBiometricLabel(): { type: PasskeyCredentialRecord['authenticatorType']; label: string } {
  if (typeof navigator === 'undefined') return { type: 'virtual_biometric', label: 'Biometric Authenticator' };
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';
  if (/iphone|ipad|ipod/.test(ua)) return { type: 'face_id', label: 'Face ID / Touch ID' };
  if (/macintosh|mac os x/.test(ua) || platform.includes('mac')) return { type: 'touch_id', label: 'Mac Touch ID' };
  if (/windows/.test(ua) || platform.includes('win')) return { type: 'windows_hello', label: 'Windows Hello (Fingerprint / Face)' };
  if (/android/.test(ua)) return { type: 'android_biometric', label: 'Android Biometric (Fingerprint)' };
  return { type: 'touch_id', label: 'Terminal Fingerprint / Face Reader' };
}

export async function checkWebAuthnCapability(): Promise<WebAuthnCapability> {
  const isSupported = typeof window !== 'undefined' && window.isSecureContext && typeof window.PublicKeyCredential !== 'undefined' && typeof navigator?.credentials?.get === 'function' && typeof navigator?.credentials?.create === 'function';
  let hasPlatformAuthenticator = false;
  let isConditionalMediationAvailable = false;
  if (isSupported) {
    try { if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') hasPlatformAuthenticator = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { hasPlatformAuthenticator = false; }
    try { if (typeof (PublicKeyCredential as any).isConditionalMediationAvailable === 'function') isConditionalMediationAvailable = await (PublicKeyCredential as any).isConditionalMediationAvailable(); } catch { isConditionalMediationAvailable = false; }
  }
  const { label } = detectBiometricLabel();
  return { isSupported, hasPlatformAuthenticator, isConditionalMediationAvailable, biometricLabel: label, platformSummary: isSupported ? `${label} available; server verification required` : 'WebAuthn unavailable; server enrollment required' };
}

export function getRegisteredPasskeys(): PasskeyCredentialRecord[] { return []; }
export function saveRegisteredPasskeys(_keys: PasskeyCredentialRecord[]): void { console.warn('[WebAuthn] Local passkey persistence is disabled.'); }

export async function registerPasskey(
  _user: { id: string; email: string; name: string; role: 'cashier' | 'manager' | 'admin' },
  _deviceLabel?: string
): Promise<{ success: boolean; credential?: PasskeyCredentialRecord; error?: string; isVirtual?: boolean }> {
  return { success: false, error: 'Passkey enrollment requires the server-side WebAuthn registration API.' };
}

export async function authenticatePasskey(
  _targetUser?: { id: string; email: string; name: string }
): Promise<{ success: boolean; credential?: PasskeyCredentialRecord; error?: string; authMethod: 'hardware_biometric' | 'virtual_passkey' }> {
  return { success: false, error: 'Passkey authentication requires server-side WebAuthn assertion verification.', authMethod: 'hardware_biometric' };
}

export function removeEnrolledPasskey(_id: string): PasskeyCredentialRecord[] { return []; }
export function resetPasskeys(): PasskeyCredentialRecord[] { return []; }
