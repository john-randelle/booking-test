import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { bookingDetail } from "../schema/booking-schema.js";
import { organization } from "../schema/auth-schema.js";
import type {
  BookingDetail, BookingDetailCreate, BookingDetailReader, BookingDetailWriter,
} from "../ports/booking-detail-repo.js";
import type { LocationType } from "../ports/booking-source.js";

type Row = typeof bookingDetail.$inferSelect;

function toDetail(row: Row, organizationName: string | null): BookingDetail {
  return { ...row, locationType: row.locationType as LocationType, organizationName };
}

export class DrizzleBookingDetailRepository implements BookingDetailReader, BookingDetailWriter {
  async findByAppointmentId(appointmentId: string): Promise<BookingDetail | null> {
    const [row] = await db
      .select({ detail: bookingDetail, organizationName: organization.name })
      .from(bookingDetail)
      .leftJoin(organization, eq(organization.id, bookingDetail.organizationId))
      .where(eq(bookingDetail.appointmentId, appointmentId))
      .limit(1);
    return row ? toDetail(row.detail, row.organizationName) : null;
  }

  async create(input: BookingDetailCreate): Promise<BookingDetail> {
    const [row] = await db
      .insert(bookingDetail)
      .values({ id: crypto.randomUUID(), ...input })
      .returning();
    return toDetail(row!, null);
  }
}
