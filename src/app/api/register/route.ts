import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http";

const registrationSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().max(254),
  password: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readBoundedJson(request, 2_048);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request payload is too large." }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a name, valid email, and password of at least 12 characters." },
      { status: 400 },
    );
  }

  try {
    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
      },
      select: { id: true },
    });
    return NextResponse.json({ userId: user.id }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Account creation is temporarily unavailable." }, { status: 503 });
  }
}