// AnalyticsService: thin wrapper around @react-native-firebase/analytics.
//
// Why a wrapper?
//  1. Every call is try/catch-guarded so a broken analytics call (e.g. Firebase
//     not initialised in dev, network outage, invalid event) can never crash
//     the app or interrupt a user flow.
//  2. Centralised event names so we don't scatter magic strings across screens
//     — makes it easy to audit what we track and rename events later without
//     hunting through the codebase.
//  3. Debug mode logging: when __DEV__ we mirror events to the console so you
//     can verify the correct data flows without opening the Firebase DebugView.
//
// Firebase Analytics constraints to keep in mind:
//  - Event names: <= 40 chars, only [A-Za-z0-9_], must start with a letter.
//  - Param names: <= 40 chars, param values <= 100 chars (strings) or numeric.
//  - Reserved prefixes: firebase_, google_, ga_ — avoid.
//  - Custom events are visible in DebugView immediately, but roll into the GA4
//    UI reports after ~24 hours.

import analytics from '@react-native-firebase/analytics';

// Central event-name registry. Keep names snake_case and descriptive.
export const AnalyticsEvents = {
  // Auth
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  // Employee actions
  ATTENDANCE_MARK: 'attendance_mark',
  LEAVE_APPLY: 'leave_apply',
  BANK_DETAILS_UPDATE: 'bank_details_update',
  PASSWORD_UPDATE: 'password_update',
  // Admin actions
  LEAVE_STATUS_UPDATE: 'leave_status_update',
  TRANSACTION_ADDED: 'transaction_added',
  EMPLOYEE_ADDED: 'employee_added',
  EMPLOYEE_STATUS_UPDATED: 'employee_status_updated',
  OFFICE_CREATED: 'office_created',
  OFFICE_UPDATED: 'office_updated',
  OFFICE_DELETED: 'office_deleted',
  HOLIDAY_ADDED: 'holiday_added',
  HOLIDAY_DELETED: 'holiday_deleted',
  ATTENDANCE_FINALIZED: 'attendance_finalized',
};

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

const safeCall = async (label, fn) => {
  try {
    await fn();
  } catch (error) {
    // Never let analytics failures bubble up to the UI. Warn in dev so
    // integration issues (missing plist, wrong package, etc.) are visible.
    if (isDev) {
      console.warn(`[Analytics] ${label} failed:`, error?.message || error);
    }
  }
};

/**
 * Log a custom event. `params` is optional; values must be strings, numbers,
 * or booleans (Firebase will coerce/reject anything else).
 */
export const logEvent = async (name, params = {}) => {
  if (isDev) {
    console.log(`[Analytics] event: ${name}`, params);
  }
  await safeCall(`logEvent(${name})`, () => analytics().logEvent(name, params));
};

/**
 * Log a screen view. `screenName` is required; `screenClass` defaults to
 * screenName so Firebase's "Screen class" report groups by the same key.
 * Called automatically by the route-change hook, but exposed for edge cases.
 */
export const logScreenView = async (screenName, screenClass) => {
  if (!screenName) return;
  if (isDev) {
    console.log(`[Analytics] screen_view: ${screenName}`);
  }
  await safeCall(`logScreenView(${screenName})`, () =>
    analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    })
  );
};

/**
 * Associate all future events with a stable user id (e.g. employee id). Pass
 * null to clear (on logout).
 */
export const setUserId = async (userId) => {
  await safeCall('setUserId', () => analytics().setUserId(userId ? String(userId) : null));
};

/**
 * Attach user-level properties (role, office_id, etc.) for GA4 segmentation.
 * Values are converted to strings — GA4 user properties only accept strings.
 */
export const setUserProperties = async (props = {}) => {
  const stringified = Object.fromEntries(
    Object.entries(props).map(([k, v]) => [k, v == null ? null : String(v)])
  );
  await safeCall('setUserProperties', () => analytics().setUserProperties(stringified));
};

/**
 * Global toggle. Useful for a future "disable analytics" privacy setting.
 * When disabled, Firebase stops sending events but the SDK stays loaded.
 */
export const setAnalyticsEnabled = async (enabled) => {
  await safeCall('setAnalyticsEnabled', () => analytics().setAnalyticsCollectionEnabled(!!enabled));
};

export default {
  AnalyticsEvents,
  logEvent,
  logScreenView,
  setUserId,
  setUserProperties,
  setAnalyticsEnabled,
};
