import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../lib/firebase.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
function harness({ fail = [], restoredUser = null, server = false } = {}) {
  const calls = [];
  const auth = { currentUser: null, config: { authDomain: 'luma.wildsaura.com' }, async authStateReady() { calls.push('restore'); this.currentUser = restoredUser; } };
  const exports = {};
  const sdk = {
    getAuth() { calls.push('server-auth'); return auth; },
    indexedDBLocalPersistence: 'idb', browserLocalPersistence: 'local', browserPopupRedirectResolver: 'resolver',
    initializeAuth(_app, options) { calls.push([...options.persistence]); return auth; },
    async setPersistence(_auth, mode) { calls.push(mode); if (fail.includes(mode)) throw Error('blocked'); },
    async signInAnonymously() { calls.push('guest'); return { user: { uid: 'guest' } }; },
    async getRedirectResult() { calls.push('redirect'); return null; },
  };
  vm.runInNewContext(outputText, { exports, process: { env: {} }, require(name) {
    if (name === 'firebase/auth') return sdk;
    if (name === 'firebase/app') return { getApps: () => [], initializeApp: () => ({}) };
    if (name === 'firebase/firestore') return { getFirestore: () => ({}) };
    if (name === 'firebase/storage') return { getStorage: () => ({}) };
    throw Error(name);
  }, window: server ? undefined : { location: { protocol: 'https:', host: 'luma.wildsaura.com' }, matchMedia: () => ({ matches: false }), navigator: { standalone: true } } });
  return { api: exports, calls };
}
test('durable storage preparation is shared', async () => {
  const { api, calls } = harness();
  await Promise.all([api.prepareAuthPersistence(), api.prepareAuthPersistence()]);
  assert.deepEqual(calls, [['idb', 'local'], 'restore', 'idb']);
});
test('IndexedDB failure falls back to localStorage', async () => {
  const { api, calls } = harness({ fail: ['idb'] }); await api.prepareAuthPersistence();
  assert.deepEqual(calls.slice(1), ['restore', 'idb', 'local']);
});
test('blocked storage reports an error and allows retry', async () => {
  const fail = ['idb', 'local']; const { api } = harness({ fail });
  await assert.rejects(api.prepareAuthPersistence(), /cannot save your login/);
  fail.length = 0; await api.prepareAuthPersistence();
});
test('a restored member is never replaced with a guest', async () => {
  const user = { uid: 'member' }; const { api, calls } = harness({ restoredUser: user });
  assert.equal(await api.ensureAuthUser(), user); assert.ok(!calls.includes('guest'));
});
test('concurrent guest actions share one sign-in', async () => {
  const { api, calls } = harness(); await Promise.all([api.ensureAuthUser(), api.ensureAuthUser()]);
  assert.equal(calls.filter(c => c === 'guest').length, 1);
});
test('redirect result is consumed once and iOS standalone is detected', async () => {
  const { api, calls } = harness(); await Promise.all([api.completeGoogleRedirect(), api.completeGoogleRedirect()]);
  assert.equal(calls.filter(c => c === 'redirect').length, 1);
  assert.equal(api.canUseGoogleRedirect(), true); assert.equal(api.isStandaloneApp(), true);
});

test('server prerendering avoids browser persistence initialization', () => {
  const { calls } = harness({ server: true });
  assert.deepEqual(calls, ['server-auth']);
});
