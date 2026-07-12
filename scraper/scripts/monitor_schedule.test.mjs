import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeMonitorTier,
  computeNextCheckAt,
  isListingDueForMonitor,
  lockoutMinutes,
  readMonitorScheduleConfig
} from "../scraper/playwright_extra/monitor_schedule.mjs";

const config = readMonitorScheduleConfig();
const now = Date.parse("2026-07-12T12:00:00.000Z");

describe("monitor_schedule", () => {
  it("promotes A/B scores to hot", () => {
    assert.equal(computeMonitorTier({ first_seen_at: "2026-06-01T00:00:00.000Z" }, "B", config, now), "hot");
  });

  it("marks old stale D listings as cold", () => {
    const tier = computeMonitorTier(
      {
        first_seen_at: "2026-06-01T00:00:00.000Z",
        last_price_change_at: "2026-06-02T00:00:00.000Z"
      },
      "D",
      config,
      now
    );
    assert.equal(tier, "cold");
  });

  it("promotes recent price drops to hot", () => {
    const tier = computeMonitorTier(
      {
        first_seen_at: "2026-06-01T00:00:00.000Z",
        last_price_change_at: "2026-07-12T08:00:00.000Z"
      },
      "D",
      config,
      now
    );
    assert.equal(tier, "hot");
  });

  it("schedules next check based on tier", () => {
    const { tier, nextCheckAt } = computeNextCheckAt(
      { first_seen_at: "2026-07-11T00:00:00.000Z" },
      "C",
      config,
      "2026-07-12T12:00:00.000Z"
    );
    assert.equal(tier, "hot");
    assert.equal(nextCheckAt, "2026-07-12T18:00:00.000Z");
  });

  it("respects lockout and due timestamps", () => {
    assert.equal(
      isListingDueForMonitor({ monitor_lockout_until: "2026-07-12T13:00:00.000Z" }, now),
      false
    );
    assert.equal(
      isListingDueForMonitor({ monitor_next_check_at: "2026-07-12T11:00:00.000Z" }, now),
      true
    );
  });

  it("backs off failures exponentially", () => {
    assert.equal(lockoutMinutes(1, config), 5);
    assert.equal(lockoutMinutes(3, config), 20);
    assert.equal(lockoutMinutes(99, config), config.failLockoutMaxMinutes);
  });
});
