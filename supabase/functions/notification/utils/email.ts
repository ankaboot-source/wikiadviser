import nodemailer from "nodemailer";

const host = Deno.env.get("SMTP_HOST");
const port = Number(Deno.env.get("SMTP_PORT") ?? 587);
const user = Deno.env.get("SMTP_USER");
const pass = Deno.env.get("SMTP_PASS");

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // true only if port is 465
  auth: {
    user,
    pass,
  },
});
