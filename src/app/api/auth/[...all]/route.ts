import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

export async function POST(request: Request) {
  const pathname = decodeURIComponent(new URL(request.url).pathname).replace(/\/+$/, "");
  if (pathname.endsWith("/sign-up/email")) {
    return Response.json(
      { error: "Please use the WattWise registration form to create an account" },
      { status: 403 },
    );
  }
  return handlers.POST(request);
}