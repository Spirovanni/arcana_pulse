import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import * as bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const db = getDatabase();
        const result = await db.listDocuments(
          DATABASE_ID,
          COLLECTIONS.users,
          [Query.equal("email", credentials.email.toLowerCase()), Query.limit(1)]
        );

        if (result.documents.length === 0) return null;

        const doc = result.documents[0];
        const valid = await bcrypt.compare(
          credentials.password,
          doc.passwordHash
        );

        if (!valid) return null;

        return {
          id: doc.$id,
          userId: doc.$id,
          workspaceId: doc.workspaceId,
          email: doc.email,
          firstName: doc.firstName,
          lastName: doc.lastName,
          role: doc.role,
          imageUrl: doc.imageUrl ?? undefined,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },

  pages: {
    signIn: "/sign-in",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.userId;
        token.workspaceId = user.workspaceId;
        token.email = user.email!;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.role = user.role;
        token.imageUrl = user.imageUrl;
      }
      return token;
    },

    async session({ session, token }) {
      session.user = {
        userId: token.userId,
        workspaceId: token.workspaceId,
        email: token.email,
        firstName: token.firstName,
        lastName: token.lastName,
        role: token.role,
        imageUrl: token.imageUrl,
      };
      return session;
    },
  },
};
