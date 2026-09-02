import nodemailer from "nodemailer"

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST ?? "smtp.gmail.com"
  const port = Number(process.env.SMTP_PORT ?? 465)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!user || !pass) throw new Error("SMTP credentials missing")

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  return transporter
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  if (process.env.NODE_ENV === "test") return

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[email] SMTP_USER/SMTP_PASS nao configurados — emails nao serao enviados")
    if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview") {
      throw new Error("SMTP credentials missing")
    }
    return
  }

  const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "no-reply@finly.app"
  const transport = getTransporter()

  await transport.sendMail({ from, to, subject, html })
}