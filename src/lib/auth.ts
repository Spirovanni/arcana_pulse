import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import * as bcrypt from "bcryptjs";
import { verifySync } from "otplib";
import { decryptSafe } from "@/lib/crypto";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "MFA Code", type: "text" },
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

        const doc = result.documents[0] as any;
        const valid = await bcrypt.compare(
          credentials.password,
          doc.passwordHash
        );

        if (!valid) return null;

        // MFA check
        if (doc.mfaEnabled && doc.mfaSecret) {
          const mfaCode = credentials.mfaCode?.trim();

          if (!mfaCode) {
            // Signal to the sign-in page that MFA is required
            throw new Error("MFA_REQUIRED");
          }

          // Validate TOTP (decrypt the stored secret first)
          const mfaSecret = decryptSafe(doc.mfaSecret as string);
          const result = verifySync({ token: mfaCode, secret: mfaSecret, strategy: "totp" });
          const totpValid = typeof result === "object" ? result.valid : result;

          if (!totpValid) {
            // Also check recovery codes
            const recoveryCodes: string[] = JSON.parse(
              doc.mfaRecoveryCodes ?? "[]"
            );
            const normalized = mfaCode.toUpperCase().replace(/\s/g, "");
            const idx = recoveryCodes.indexOf(normalized);

            if (idx === -1) throw new Error("Invalid MFA code");

            // Burn used recovery code
            recoveryCodes.splice(idx, 1);
            await db.updateDocument(DATABASE_ID, COLLECTIONS.users, doc.$id, {
              mfaRecoveryCodes: JSON.stringify(recoveryCodes),
            });
          }
        }

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
