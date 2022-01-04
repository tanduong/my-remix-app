import { createCookieSessionStorage, redirect } from "remix";
import { getAdminAuth, getSessionToken } from "./db.server";

require("dotenv").config();

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const storage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    // normally you want this to be `secure: true`
    // but that doesn't work on localhost for Safari
    // https://web.dev/when-to-use-local-https/
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

async function createUserSession(idToken, redirectTo) {
  const token = await getSessionToken(idToken);
  const session = await storage.getSession();
  session.set("token", token);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}

async function getUserSession(request) {
  const cookieSession = await storage.getSession(request.headers.get("Cookie"));
  const token = cookieSession.get("token");
  if (!token) return null;
  try {
    const tokenUser = await getAdminAuth().verifySessionCookie(token, true);
    return tokenUser;
  } catch (error) {
    return null;
  }
}

export { createUserSession, getUserSession };