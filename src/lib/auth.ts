import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
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
          membershipType: doc.membershipType ?? "standard",
          imageUrl: doc.imageUrl ?? undefined,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
    async jwt({ token, user, account, profile, trigger, session }) {
      // Support dynamic session refreshes (like swapping an avatar)
      if (trigger === "update" && session?.image) {
        token.picture = session.image;
        token.imageUrl = session.image;
      }

      if (user) {
        // Handle OAuth vs Credentials mappings
        token.userId = (user as any).userId || user.id;
        token.workspaceId = (user as any).workspaceId;
        token.email = user.email!;

        if (user.name) {
          const nameParts = user.name.split(' ');
          token.firstName = (user as any).firstName || nameParts[0] || '';
          token.lastName = (user as any).lastName || nameParts.slice(1).join(' ') || '';
        } else {
          token.firstName = (user as any).firstName;
          token.lastName = (user as any).lastName;
        }

        token.role = (user as any).role;
        token.membershipType = (user as any).membershipType ?? "standard";
        // Map OAuth user.image to our imageUrl or let NextAuth auto-population handle token.picture
        token.imageUrl = (user as any).imageUrl || user.image;
        if (user.image) token.picture = user.image;
      }
      return token;
    },

    async session({ session, token }) {
      session.user = {
        userId: token.userId as string,
        workspaceId: token.workspaceId as string,
        email: token.email as string,
        firstName: token.firstName as string,
        lastName: token.lastName as string,
        role: token.role as any,
        membershipType: token.membershipType as any,
        imageUrl: (token.imageUrl as string) || (token.picture as string),
        image: (token.picture as string) || (token.imageUrl as string),
        name: token.firstName ? `${token.firstName} ${token.lastName}`.trim() : (token.name as string),
      } as any;
      return session;
    },
  },
};
