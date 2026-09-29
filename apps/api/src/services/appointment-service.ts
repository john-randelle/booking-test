import type {
  AppointmentFilter, AppointmentListItem, AppointmentReader, AppointmentWriter,
} from "../ports/appointment-repo.js";
import type { AppointmentSource, SourceAppointment } from "../ports/appointment-source.js";
import type { CalendarReader } from "../ports/calendar-repo.js";
import type { ReferrerLookup } from "../ports/user-repo.js";

export class ValidationError extends Error {}
export class RateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super(`Please wait ${retryAfterSeconds}s before refreshing again`);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

export interface Viewer {
  id: string;
  role: string | null;
}

export interface SyncWindow {
  daysBack: number;
  daysAhead: number;
}

export interface AppointmentSyncResult {
  synced: number;
  attributed: number;
}

// What each role may see. A role missing from this map sees nothing;
// add a role by adding an entry, not by editing listFor.
const SCOPES: Record<string, (viewer: Viewer) => Partial<AppointmentFilter>> = {
  admin: () => ({}),
  specialist: (viewer) => ({ specialistId: viewer.id }),
  referrer: (viewer) => ({ referrerId: viewer.id }),
};

export class AppointmentService {
  // Last refresh per specialist. In-memory, so it is per API instance.
  private readonly lastRefresh = new Map<string, number>();

  constructor(
    private readonly appointments: AppointmentReader & AppointmentWriter,
    private readonly source: AppointmentSource,
    private readonly referrers: ReferrerLookup,
    private readonly calendars: Pick<CalendarReader, "findBySpecialistId">,
    private readonly window: SyncWindow = { daysBack: 30, daysAhead: 180 },
    private readonly refreshCooldownMs = 60_000,
  ) {}

  async listFor(
    viewer: Viewer,
    range: { from: Date; to: Date; includeCanceled?: boolean },
  ): Promise<AppointmentListItem[]> {
    assertValidRange(range.from, range.to);
    const scope = viewer.role ? SCOPES[viewer.role] : undefined;
    if (!scope) return [];
    return this.appointments.list({ ...range, ...scope(viewer) });
  }

  /** Pulls the rolling window (default: 30 days back, 180 ahead). */
  syncRecent(now = new Date()): Promise<AppointmentSyncResult> {
    return this.syncRange(
      new Date(now.getTime() - this.window.daysBack * DAY_MS),
      new Date(now.getTime() + this.window.daysAhead * DAY_MS),
    );
  }

  async syncRange(from: Date, to: Date, acuityCalendarId?: number): Promise<AppointmentSyncResult> {
    assertValidRange(from, to);
    const incoming = await this.source.fetchRange(from, to, { acuityCalendarId });
    const referrerIds = new Map<string, string | undefined>();
    let attributed = 0;

    for (const item of incoming) {
      if (await this.save(item, referrerIds)) attributed++;
    }
    return { synced: incoming.length, attributed };
  }

  /**
   * Syncs only the calendar linked to this specialist, at most once per
   * cooldown. Lets a specialist pull a new booking without a full sync.
   */
  async refreshForSpecialist(specialistId: string, now = Date.now()): Promise<AppointmentSyncResult> {
    const last = this.lastRefresh.get(specialistId);
    if (last !== undefined && now - last < this.refreshCooldownMs) {
      throw new RateLimitError(Math.ceil((this.refreshCooldownMs - (now - last)) / 1000));
    }

    const calendar = await this.calendars.findBySpecialistId(specialistId);
    if (!calendar) throw new ValidationError("No calendar is linked to your account yet");

    this.lastRefresh.set(specialistId, now); // set first so double-clicks don't both sync
    try {
      return await this.syncRange(
        new Date(now - this.window.daysBack * DAY_MS),
        new Date(now + this.window.daysAhead * DAY_MS),
        calendar.acuityId,
      );
    } catch (error) {
      this.lastRefresh.delete(specialistId); // a failed refresh shouldn't block a retry
      throw error;
    }
  }

  /** Re-reads one appointment from the source; used by webhooks. */
  async syncOne(acuityId: number): Promise<boolean> {
    const item = await this.source.fetchOne(acuityId);
    if (!item) return false;
    await this.save(item, new Map());
    return true;
  }

  // Returns whether the appointment was attributed to a referrer.
  private async save(
    item: SourceAppointment,
    referrerIds: Map<string, string | undefined>,
  ): Promise<boolean> {
    const { referrerEmail, ...fields } = item;
    const referrerId = referrerEmail
      ? await this.referrerIdFor(referrerEmail, referrerIds)
      : undefined;

    await this.appointments.upsert({ ...fields, referrerId });
    return referrerId !== undefined;
  }

  // Caches lookups for the duration of one sync: many bookings share a referrer.
  private async referrerIdFor(
    email: string,
    cache: Map<string, string | undefined>,
  ): Promise<string | undefined> {
    const key = email.trim().toLowerCase();
    if (!cache.has(key)) {
      cache.set(key, (await this.referrers.findReferrerByEmail(key))?.id);
    }
    return cache.get(key);
  }
}

function assertValidRange(from: Date, to: Date): void {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new ValidationError("from and to must be valid dates");
  }
  if (from > to) throw new ValidationError("from must be before to");
  if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS) {
    throw new ValidationError(`Range cannot exceed ${MAX_RANGE_DAYS} days`);
  }
}
