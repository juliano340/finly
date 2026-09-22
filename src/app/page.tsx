import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { LandingPage } from "./(marketing)/_components/landing-page"

export default async function HomePage() {
  const session = await auth()
  if (session?.user) redirect("/dashboard")

  return <LandingPage />
}
