import type { UserRole } from "@/lib/types";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      userId: string;
      workspaceId: string;
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      imageUrl?: string;
    };
  }

  interface User {
    userId: string;
    workspaceId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    imageUrl?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    workspaceId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    imageUrl?: string;
  }
}
