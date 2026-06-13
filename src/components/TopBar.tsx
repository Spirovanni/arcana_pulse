"use client";

import { useSession } from "next-auth/react";
import { UserCircle2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function TopBar() {
  const { data: session } = useSession();
  const user = session?.user as any;

  if (!user) return null;

  const fullName = user.name || (user.firstName ? `${user.firstName} ${user.lastName}`.trim() : "");
  
  // Try custom uploaded avatar first, fallback to social login image
  const primaryImageUrl = user.imageUrl;
  const fallbackImageUrl = user.image;

  const [imgSrc, setImgSrc] = useState<string | undefined>(primaryImageUrl || fallbackImageUrl);

  useEffect(() => {
    setImgSrc(primaryImageUrl || fallbackImageUrl);
  }, [primaryImageUrl, fallbackImageUrl]);

  return (
    <div className="hidden lg:flex items-center justify-end px-10 py-4 border-b border-outline/30 bg-surface sticky top-0 z-30">
      <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
        <div className="relative size-8 rounded-full overflow-hidden border border-outline/60 shrink-0">
          {imgSrc ? (
            <img 
              src={imgSrc} 
              alt={fullName} 
              className="size-full object-cover" 
              referrerPolicy="no-referrer"
              onError={() => {
                if (imgSrc === primaryImageUrl && fallbackImageUrl && primaryImageUrl !== fallbackImageUrl) {
                  setImgSrc(fallbackImageUrl);
                } else {
                  setImgSrc(undefined);
                }
              }}
            />
          ) : (
            <div className="size-full bg-primary/10 flex items-center justify-center">
              <UserCircle2 className="size-5 text-primary" />
            </div>
          )}
        </div>
        <span className="text-sm text-on-surface font-medium tracking-wide group-hover:text-primary transition-colors">
          {fullName}
        </span>
      </Link>
    </div>
  );
}
