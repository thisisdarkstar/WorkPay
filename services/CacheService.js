// CacheService: lightweight AsyncStorage-backed read cache with TTL and
// explicit invalidation. Designed to cut redundant API hits for data that
// changes rarely (holidays, offices) or on a known cadence (leaves,
// transactions, attendance history).
//
// Design goals:
//  - Safe by default: every cached value carries a timestamp + TTL, so a stale
//    entry is never silently trusted forever.
//  - Explicit invalidation: mutations call invalidate(key) so the very next
//    read misses the cache and refetches. This is what keeps "when changed
//    they get refreshed" correct.
//  - stale-while-revalidate: getSWR() returns cached data instantly (even if
//    stale) while a fresh copy is fetched in the background, so the UI never
//    blocks on the network for cacheable screens.
//  - Namespaced: all keys live under CACHE_PREFIX so clearAll() (e.g. on
//    logout) wipes every cached read without touching the SecureStore token.

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@workpay:cache:';

// Common TTLs (ms). Tune per call site by passing an explicit ttl.
export const TTL = {
  // Tier 1 — rarely changes. Long TTL; correctness comes from invalidation.
  DAY: 24 * 60 * 60 * 1000,
  TWELVE_HOURS: 12 * 60 * 60 * 1000,
  // Tier 2 — changes on a known cadence; short TTL + SWR keeps it fresh-ish.
  HOUR: 60 * 60 * 1000,
  FIVE_MIN: 5 * 60 * 1000,
};

// Stable cache-key builders so read sites and invalidation sites never drift.
export const CacheKeys = {
  holidays: (year) => `holidays:${year}`,
  offices: () => 'offices',
  employeeDashboard: () => 'employee:dashboard',
  employeesAll: () => 'employees:all',
  leaves: (year) => `leaves:${year}`,
  transactionsEmployee: (year) => `transactions:employee:${year}`,
  attendance: (year, month) => `attendance:${year}-${month}`,
};

const fullKey = (key) => `${CACHE_PREFIX}${key}`;

/**
 * Read a cached entry. Returns { value, isStale, age } or null on a miss.
 * A miss is either "no entry" or a corrupted/unparseable entry.
 */
export const getEntry = async (key, ttl = TTL.HOUR) => {
  try {
    const raw = await AsyncStorage.getItem(fullKey(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.timestamp !== 'number') return null;

    const age = Date.now() - parsed.timestamp;
    return {
      value: parsed.value,
      age,
      isStale: age > ttl,
    };
  } catch (error) {
    console.warn(`[CacheService] Failed to read "${key}":`, error?.message || error);
    return null;
  }
};

/**
 * Return cached value only if present AND still within ttl. Otherwise null.
 * Use for a simple "skip the network if fresh" guard.
 */
export const get = async (key, ttl = TTL.HOUR) => {
  const entry = await getEntry(key, ttl);
  if (!entry || entry.isStale) return null;
  return entry.value;
};

/** Persist a value with the current timestamp. */
export const set = async (key, value) => {
  try {
    const payload = JSON.stringify({ value, timestamp: Date.now() });
    await AsyncStorage.setItem(fullKey(key), payload);
    return true;
  } catch (error) {
    console.warn(`[CacheService] Failed to write "${key}":`, error?.message || error);
    return false;
  }
};

/** Remove a single cache entry. Call this from mutations that change the data. */
export const invalidate = async (key) => {
  try {
    await AsyncStorage.removeItem(fullKey(key));
    return true;
  } catch (error) {
    console.warn(`[CacheService] Failed to invalidate "${key}":`, error?.message || error);
    return false;
  }
};

/** Wipe all WorkPay caches (e.g. on logout / account switch). */
export const clearAll = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const toRemove = allKeys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    return true;
  } catch (error) {
    console.warn('[CacheService] Failed to clear all caches:', error?.message || error);
    return false;
  }
};

/**
 * stale-while-revalidate read-through.
 *
 * @param {string}   key       cache key (use CacheKeys.*)
 * @param {Function} fetcher   async () => freshValue  (throws on network error)
 * @param {object}   opts
 * @param {number}   opts.ttl        freshness window in ms (default TTL.HOUR)
 * @param {Function} opts.onData     called with (value, { fromCache, isStale })
 *                                   whenever data is available — once for the
 *                                   cached hit and again after a background
 *                                   revalidate. Lets the screen paint instantly
 *                                   then update in place.
 * @param {boolean}  opts.forceRefresh  skip the cached value and always fetch
 *                                       (used by pull-to-refresh).
 * @returns {Promise<value>} the freshest value obtained (fresh if the network
 *                           succeeded, otherwise the cached value as a fallback).
 */
export const getSWR = async (key, fetcher, opts = {}) => {
  const { ttl = TTL.HOUR, onData, forceRefresh = false } = opts;

  const entry = forceRefresh ? null : await getEntry(key, ttl);

  // 1. Serve cache immediately if we have anything at all.
  if (entry) {
    onData?.(entry.value, { fromCache: true, isStale: entry.isStale });
    // Fresh enough → no network needed.
    if (!entry.isStale) return entry.value;
  }

  // 2. Revalidate from network (cache miss, stale, or forceRefresh).
  try {
    const fresh = await fetcher();
    await set(key, fresh);
    onData?.(fresh, { fromCache: false, isStale: false });
    return fresh;
  } catch (error) {
    // Network failed: fall back to stale cache if we have it; else rethrow so
    // the caller can surface the error (mirrors the pre-cache behaviour).
    if (entry) return entry.value;
    throw error;
  }
};

export default {
  TTL,
  CacheKeys,
  get,
  getEntry,
  set,
  invalidate,
  clearAll,
  getSWR,
};
