export interface CalendarLinker {
  /** Links the specialist to an unlinked calendar with the same email, if one exists. */
  linkSpecialist(userId: string): Promise<boolean>;
  /** Removes the specialist from whatever calendar they are linked to. */
  unlinkSpecialist(userId: string): Promise<void>;
}