import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { AUTH_SECRET } from "@/lib/auth-secret"
import { findOrCreateGoogleUser } from "@/features/auth/auth.service"
import {
  clearLoginFailures,
  loginRateLimitKeys,
  isLoginBlocked,
  recordLoginFailure,
} from "@/features/auth/login-rate-limit.service"

// Public dummy hash used only to keep failed-login timing consistent; it is not a credential.
const DUMMY_PASSWORD_HASH = "$2b$12$AFX1qqGxoGwG6.wcRv2GoOPr1r4vsEfaPdCjHY/rdZof1Zkc0Os4e" // nosemgrep: generic.secrets.security.detected-bcrypt-hash.detected-bcrypt-hash

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified"
}

class OAuthAccountError extends CredentialsSignin {
  code = "oauth_account"
}

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: AUTH_SECRET,
  pages: { signIn: "/login" },
  logger: {
    error(error) {
      if (error instanceof CredentialsSignin) return
      console.error("[auth]", error)
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials, request) {
        const { email: rawEmail, password } = credentials as { email: string; password: string }
        const email = rawEmail?.trim().toLowerCase()
        if (!email || !password) return null

        const rateLimitKeys = loginRateLimitKeys(email, request)
        if (await isLoginBlocked(rateLimitKeys)) {
          await compare(password, DUMMY_PASSWORD_HASH)
          return null
        }

        const user = await prisma.user.findUnique({ where: { email } })
        if (user && !user.passwordHash) {
          await compare(password, DUMMY_PASSWORD_HASH)
          throw new OAuthAccountError()
        }

        const valid = await compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
        if (!user?.passwordHash || !valid) {
          await recordLoginFailure(rateLimitKeys)
          return null
        }

        if (!user.emailVerified) {
          throw new EmailNotVerifiedError()
        }

        await clearLoginFailures(rateLimitKeys)

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
    ...(googleEnabled
      ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user && account?.provider === "google") {
        const dbUser = await findOrCreateGoogleUser({
          email: token.email ?? "",
          name: user.name ?? null,
          image: user.image ?? null,
          emailVerified: Boolean((profile as { email_verified?: boolean | null } | null)?.email_verified),
        })
        if (!dbUser) return {}
        token.id = dbUser.id
        token.loginAt = Math.floor(Date.now() / 1000)
      } else if (user) {
        token.id = user.id
        token.loginAt = Math.floor(Date.now() / 1000)
      }

      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, image: true, passwordChangedAt: true },
        })
        if (dbUser) {
          token.name = dbUser.name
          if (dbUser.image) token.picture = dbUser.image
        }
        if (dbUser?.passwordChangedAt) {
          const changedAtSec = Math.floor(dbUser.passwordChangedAt.getTime() / 1000)
          const issuedAtSec = (token.loginAt as number | undefined) ?? 0
          if (changedAtSec > issuedAtSec) {
            return {}
          }
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string
      return session
    },
  },
})
