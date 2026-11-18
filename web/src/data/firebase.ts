import { initializeApp } from 'firebase/app';
import { CustomProvider, initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAuth, signInAnonymously, type User } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { fetchAndActivate, getRemoteConfig, getValue } from 'firebase/remote-config';
import { getAI, GoogleAIBackend } from 'firebase/ai';

const env = import.meta.env;

export const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

// App Check is mandatory for Firebase AI Logic. In development, the SDK prints a debug
// token to the console; register it in the Firebase console (App Check > Manage debug tokens).
// Never commit a debug token.
if (env.DEV) {
  (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
    env.VITE_APPCHECK_DEBUG_TOKEN || true;
}
const siteKey = env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
initializeAppCheck(app, {
  // Without a site key (early local development) only the registered debug token passes App Check.
  provider: siteKey
    ? new ReCaptchaEnterpriseProvider(siteKey)
    : new CustomProvider({
        getToken: () => Promise.reject(new Error('VITE_RECAPTCHA_ENTERPRISE_SITE_KEY is not set')),
      }),
  isTokenAutoRefreshEnabled: true,
});

export const auth = getAuth(app);
// Optional candidate fields (placeId, mapsUri) may be undefined; don't let that fail a write.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
export const ai = getAI(app, { backend: new GoogleAIBackend() });

const rc = getRemoteConfig(app);
rc.settings.minimumFetchIntervalMillis = env.DEV ? 0 : 60 * 60 * 1000;
rc.defaultConfig = {
  cloud_model: 'gemini-3.8-flash',
  cloud_model_lite: 'gemini-3.5-flash-lite',
  candidate_source: 'fixture',
  max_candidates: 10,
  attr_version: 1,
  prompt_profile: '',
  prompt_fit: '',
};

/** Remote Config values. Models are rebuilt on every call, so a config change applies immediately. */
export const cfg = {
  cloudModel: () => getValue(rc, 'cloud_model').asString(),
  cloudModelLite: () => getValue(rc, 'cloud_model_lite').asString(),
  candidateSource: () => (getValue(rc, 'candidate_source').asString() === 'maps' ? 'maps' : 'fixture'),
  maxCandidates: () => Math.min(10, Math.max(2, getValue(rc, 'max_candidates').asNumber() || 10)),
  promptProfile: () => getValue(rc, 'prompt_profile').asString(),
  promptFit: () => getValue(rc, 'prompt_fit').asString(),
};

let userPromise: Promise<User> | null = null;

/** Fetch config and sign in anonymously. Safe to call many times. */
export function ready(): Promise<User> {
  userPromise ??= (async () => {
    await fetchAndActivate(rc).catch((e) => console.warn('Remote Config fetch failed; using defaults', e));
    const cred = await signInAnonymously(auth);
    return cred.user;
  })().catch((e) => {
    userPromise = null; // let a retry sign in again
    throw e;
  });
  return userPromise;
}

export function uid(): string {
  const u = auth.currentUser;
  if (!u) throw new Error('Not signed in yet');
  return u.uid;
}
