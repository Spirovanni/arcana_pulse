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
        token.email = user.email!;

        // Handle OAuth vs Credentials mappings
        if (account?.provider === "google") {
          try {
            const db = getDatabase();
            const result = await db.listDocuments(
              DATABASE_ID,
              COLLECTIONS.users,
              [Query.equal("email", user.email!.toLowerCase()), Query.limit(1)]
            );

            let doc: any;
            if (result.documents.length > 0) {
              doc = result.documents[0];
              // Link Google user to their existing account, and update the profile picture in database to match their social login picture
              if (user.image && doc.imageUrl !== user.image) {
                await db.updateDocument(DATABASE_ID, COLLECTIONS.users, doc.$id, {
                  imageUrl: user.image,
                });
                doc.imageUrl = user.image;
              }
            } else {
              // Create user document in database if it doesn't exist yet
              const nameParts = user.name ? user.name.split(' ') : [];
              const firstName = nameParts[0] || '';
              const lastName = nameParts.slice(1).join(' ') || '';
              const generatedId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
              doc = await db.createDocument(
                DATABASE_ID,
                COLLECTIONS.users,
                generatedId,
                {
                  workspaceId: "ws-001",
                  email: user.email!.toLowerCase(),
                  passwordHash: "",
                  firstName,
                  lastName,
                  role: "owner",
                  membershipType: "standard",
                  imageUrl: user.image ?? undefined,
                }
              );
            }

            token.userId = doc.$id;
            token.workspaceId = doc.workspaceId;
            token.firstName = doc.firstName;
            token.lastName = doc.lastName;
            token.role = doc.role;
            token.membershipType = doc.membershipType;
            token.imageUrl = (doc.imageUrl || user.image || undefined) as string | undefined;
          } catch (err) {
            console.error("Error matching/creating Google user in database:", err);
            // Fallback to Google profile data
            token.userId = user.id;
            token.workspaceId = "ws-001";
            const nameParts = user.name ? user.name.split(' ') : [];
            token.firstName = nameParts[0] || '';
            token.lastName = nameParts.slice(1).join(' ') || '';
            token.role = "owner";
            token.membershipType = "standard";
            token.imageUrl = (user.image || undefined) as string | undefined;
          }
        } else {
          // Credentials Provider
          token.userId = (user as any).userId || user.id;
          token.workspaceId = (user as any).workspaceId;
          
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
          token.imageUrl = ((user as any).imageUrl || user.image || undefined) as string | undefined;
        }

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
