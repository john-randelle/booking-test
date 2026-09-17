import { Button } from "@workspace/ui/components/button"
import Link from "next/link"

export default function Page() {
  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Dashboard!</h1>
          <Button nativeButton={false} render={<Link href="/calendars" />}>View calendars</Button>
        </div>
      </div>
    </div>
  )
}
