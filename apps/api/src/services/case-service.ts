import type { AppointmentListItem, AppointmentLookup } from "../ports/appointment-repo.js";
import type { BookingDetail, BookingDetailReader } from "../ports/booking-detail-repo.js";
import type { Viewer } from "./appointment-service.js";

export class NotFoundError extends Error {}

export interface CaseView {
  appointment: AppointmentListItem;
  /** Null for appointments that came from the Acuity sync rather than Quick schedule. */
  details: BookingDetail | null;
}

// Who may open a case; mirrors the Bookings list scopes in AppointmentService.
// A role missing from this map can open nothing.
const CAN_VIEW: Record<string, (viewer: Viewer, item: AppointmentListItem) => boolean> = {
  admin: () => true,
  specialist: (viewer, item) => item.specialistId === viewer.id,
  referrer: (viewer, item) => item.referrerId === viewer.id,
};

export class CaseService {
  constructor(
    private readonly appointments: AppointmentLookup,
    private readonly details: BookingDetailReader,
  ) {}

  /** Throws NotFoundError for a missing case and for one the viewer may not see. */
  async get(viewer: Viewer, appointmentId: string): Promise<CaseView> {
    const appointment = await this.appointments.findById(appointmentId);
    const canView = viewer.role ? CAN_VIEW[viewer.role] : undefined;
    if (!appointment || !canView?.(viewer, appointment)) {
      throw new NotFoundError("Case not found");
    }
    return { appointment, details: await this.details.findByAppointmentId(appointmentId) };
  }
}
