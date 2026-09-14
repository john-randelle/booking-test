"use client"
import { useState } from "react"
import { cn } from "cn"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@workspace/ui/components/dialog"
import { Label } from "@workspace/ui/components/label"
import {authClient} from "@/lib/auth-client"



export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
   const [error, setError] = useState<string | null>(null)
   const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    const result = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    })

    setPending(false)
    if (result.error) {
      setError(result.error.message ?? "Login failed")
      return
    }
    window.location.href = "/"
  }
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                    <a
                      href="#"
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                </div>
                <Input id="password" name="password" type="password" required />
              </Field>
              {error && <FieldError>{error}</FieldError>}
              <Field>
                <Button type="submit" disabled={pending}>
                  {pending ? "Logging in..." : "Login"}
                </Button>
                <Button variant="outline" type="button" onClick={() => authClient.signIn.social({ provider: "cognito", callbackURL: "/"})}>
                  Login with Cognito
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="#">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
