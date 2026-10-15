import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(12).max(128),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  providers: [
    Credentials({
      credentials: { email: {}, password: { type: "password" } },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          const user = await db.user.findUnique({
            where: { email: parsed.data.email.toLowerCase() },
          });
          if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;

          return { id: user.id, email: user.email, name: user.name };
        } catch {
          throw new Error("Sign-in is temporarily unavailable.");
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});