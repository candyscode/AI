'use strict';
const { createLogger } = require('./logger');

/**
 * Automation Scheduler
 *
 * Runs a 60-second ticker. On each tick, checks all apartments' enabled automations
 * and fires actions when the current local HH:mm matches the configured time.
 *
 * Guarantees each routine fires at most once per minute by tracking the last
 * executed minute per routine.
 */

const lastFiredMinute = new Map(); // automationId -> "YYYY-MM-DDTHH:mm"

function getCurrentMinuteKey() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${m}`;
}

function getCurrentHHmm() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let tickerHandle = null;
let getConfigFn = null;
let executeActionFn = null;
let persistStatusFn = null;
const logger = createLogger('Scheduler');

/**
 * Execute a single automation routine for a given apartment.
 * @param {object} apartment - Full apartment object from config
 * @param {object} automation - The automation to run
 * @param {object} allFloors - Combined private + shared floors for action resolution
 */
async function runAutomation(apartment, automation, allFloors) {
  logger.info('Running automation', { routine: automation.name, apartment: apartment.name });
  const results = [];

  for (const action of automation.actions) {
    try {
      await executeActionFn(apartment, action, allFloors);
      results.push({ id: action.id, ok: true });
    } catch (err) {
      logger.warn('Automation action failed', { routine: automation.name, actionId: action.id, error: err.message });
      results.push({ id: action.id, ok: false, error: err.message });
    }
    await sleep(600); // 600ms gap between actions
  }

  const anyError = results.some((r) => !r.ok);
  const status = anyError ? 'error' : 'ok';
  const runAt = new Date().toISOString();

  if (persistStatusFn) {
    try {
      await persistStatusFn(apartment.id, automation.id, { lastRunAt: runAt, lastRunStatus: status });
    } catch (err) {
      logger.error('Failed to persist automation status', { routine: automation.name, apartment: apartment.name, error: err.message });
    }
  }

  logger.info('Automation finished', { routine: automation.name, apartment: apartment.name, status });
}

async function tick() {
  if (!getConfigFn) return;

  const config = getConfigFn();
  if (!Array.isArray(config?.apartments)) return;

  const currentHHmm = getCurrentHHmm();
  const currentMinuteKey = getCurrentMinuteKey();

  for (const apartment of config.apartments) {
    if (!Array.isArray(apartment.automations)) continue;

    // Build full floors list (private + shared) for action resolution
    const sharedAreas = Array.isArray(config.building?.sharedAreas) ? config.building.sharedAreas : [];
    const allFloors = [
      ...(Array.isArray(apartment.floors) ? apartment.floors : []),
      ...sharedAreas,
    ];

    for (const automation of apartment.automations) {
      if (!automation.enabled) continue;
      // Only time-based routines are handled by the clock tick
      const isTimeBased = !automation.triggerType || automation.triggerType === 'time';
      if (!isTimeBased) continue;
      if (automation.time !== currentHHmm) continue;

      const key = `${automation.id}__${currentMinuteKey}`;
      if (lastFiredMinute.has(key)) continue; // already fired this minute

      lastFiredMinute.set(key, true);

      // Fire async, don't await so we don't block subsequent routines
      runAutomation(apartment, automation, allFloors).catch((err) => {
        logger.error('Unhandled automation error', { routine: automation.name, apartment: apartment.name, error: err.message });
      });
    }
  }

  // Prune old keys to prevent memory leak (keep only last 2 minutes)
  const twoMinsAgoMs = Date.now() - 2 * 60 * 1000;
  for (const key of lastFiredMinute.keys()) {
    const parts = key.split('__');
    if (parts.length < 2) { lastFiredMinute.delete(key); continue; }
    const ts = new Date(parts[1]);
    if (ts.getTime() < twoMinsAgoMs) lastFiredMinute.delete(key);
  }
}

/**
 * Start the scheduler.
 * @param {Function} getConfig - Returns the current in-memory config object
 * @param {Function} executeAction - async (apartment, action, allFloors) => void
 * @param {Function} persistStatus - async (apartmentId, automationId, {lastRunAt, lastRunStatus}) => void
 */
function startScheduler(getConfig, executeAction, persistStatus) {
  getConfigFn = getConfig;
  executeActionFn = executeAction;
  persistStatusFn = persistStatus;

  if (tickerHandle) clearInterval(tickerHandle);
  tickerHandle = setInterval(() => {
    tick().catch((err) => logger.error('Scheduler tick failed', { error: err.message }));
  }, 60 * 1000);
  logger.info('Automation scheduler started', { intervalSeconds: 60 });
}

/**
 * Reload scheduler (call after config changes). Restarts the interval cleanly.
 */
function reloadScheduler() {
  if (!getConfigFn || !executeActionFn) return;
  if (tickerHandle) clearInterval(tickerHandle);
  tickerHandle = setInterval(() => {
    tick().catch((err) => logger.error('Scheduler tick failed', { error: err.message }));
  }, 60 * 1000);
  logger.debug('Automation scheduler reloaded');
}

/**
 * Fire all sun-triggered routines for a given triggerType ('sunrise' | 'sunset').
 * Called from server.js when a GA value change matches the sunTrigger config.
 *
 * @param {object} config - Full config object
 * @param {string} triggerType - 'sunrise' | 'sunset'
 * @param {string} firingApartmentId - The apartment whose sunTrigger GA fired
 */
async function triggerSunRoutines(config, triggerType, firingApartmentId) {
  if (!Array.isArray(config?.apartments)) return;

  const currentMinuteKey = getCurrentMinuteKey();

  for (const apartment of config.apartments) {
    if (apartment.id !== firingApartmentId) continue;
    if (!Array.isArray(apartment.automations)) continue;

    const sharedAreas = Array.isArray(config.building?.sharedAreas) ? config.building.sharedAreas : [];
    const allFloors = [
      ...(Array.isArray(apartment.floors) ? apartment.floors : []),
      ...sharedAreas,
    ];

    for (const automation of apartment.automations) {
      if (!automation.enabled) continue;
      if (automation.triggerType !== triggerType) continue;

      // Deduplicate: don't fire the same routine twice in the same minute
      const key = `${automation.id}__${currentMinuteKey}`;
      if (lastFiredMinute.has(key)) continue;
      lastFiredMinute.set(key, true);

      logger.info('Sun trigger firing automation', { trigger: triggerType, routine: automation.name, apartment: apartment.name });

      runAutomation(apartment, automation, allFloors).catch((err) => {
        logger.error('Unhandled sun-trigger automation error', { routine: automation.name, apartment: apartment.name, error: err.message });
      });
    }
  }
}

function stopScheduler() {
  if (tickerHandle) { clearInterval(tickerHandle); tickerHandle = null; }
}

module.exports = { startScheduler, reloadScheduler, stopScheduler, triggerSunRoutines };
