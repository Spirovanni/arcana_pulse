"use client";

import { useSession } from "next-auth/react";
import { User, Mail, Shield, Key, AtSign, Globe, BadgeCheck, ShieldAlert, Upload, Loader2, ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (status === "loading") {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 w-48 bg-surface-container rounded" />
        <div className="h-64 rounded-sm bg-surface-container-high border border-outline p-6" />
      </div>
    );
  }

  if (!session?.user) {
    router.push("/sign-in");
    return null;
  }

  const user = session.user as any;
  const originalImageUrl = user.image || user.imageUrl;
  const fullName = user.name || (user.firstName ? `${user.firstName} ${user.lastName}` : "Sovereign User");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please upload a valid image (JPEG, PNG, or WebP).");
      return;
    }

    // Validate size (Max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError("Image must be smaller than 5MB.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Update the active authenticated JWT session natively
      await update({ image: data.url });

      // Instantly preview locally
      setLocalAvatar(data.url);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload avatar.");
    } finally {
      setIsUploading(false);
    }
  };

  const currentDisplayAvatar = localAvatar || originalImageUrl;

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-light text-on-surface tracking-tight">Profile Settings</h1>
        <p className="text-sm text-secondary mt-1">
          Manage your personal identity, avatar, and security credentials
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="rounded-sm bg-surface-container-high border border-outline p-8 relative overflow-hidden flex flex-col md:flex-row gap-8 items-center md:items-start group">
        {/* Glow behind avatar */}
        <div className="absolute top-1/2 left-24 -translate-y-1/2 min-w-0 min-h-0 size-32 bg-primary/10 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/20 transition-all duration-700" />
        
        <div className="relative flex-shrink-0">
          <div className="size-24 rounded-full bg-primary/5 border border-primary/20 flex flex-col items-center justify-center relative overflow-hidden shadow-[0_0_15px_rgba(197,160,89,0.15)] group-hover:shadow-[0_0_25px_rgba(197,160,89,0.3)] transition-all duration-500">
            {isUploading ? (
              <Loader2 className="size-8 text-primary animate-spin" />
            ) : currentDisplayAvatar ? (
              <img 
                src={currentDisplayAvatar} 
                alt="Profile Avatar" 
                className="size-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-primary font-headline font-bold text-3xl">
                {fullName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-surface-container border border-outline">
            <BadgeCheck className="size-4 text-arcana-success" />
          </div>
        </div>

        <div className="flex-1 space-y-3 text-center md:text-left z-10 w-full min-w-0">
          <div className="min-w-0">
            <h2 className="font-headline text-2xl font-bold text-on-surface truncate">{fullName}</h2>
            <div className="flex items-center gap-2 justify-center md:justify-start mt-1 cursor-default text-secondary hover:text-primary transition-colors w-fit mx-auto md:mx-0 min-w-0">
               <AtSign className="size-3.5 flex-shrink-0" />
               <p className="text-sm font-mono truncate">{user.email}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
            <div className="px-3 py-1.5 rounded-sm bg-on-surface/5 border border-outline text-[10px] uppercase tracking-widest text-secondary font-bold flex items-center gap-1.5">
              <User className="size-3.5" />
              Role: <span className="text-on-surface capitalize">{user.role || 'Member'}</span>
            </div>
            <div className="px-3 py-1.5 rounded-sm bg-green-500/10 border border-green-500/20 text-[10px] uppercase tracking-widest text-arcana-success font-bold flex items-center gap-1.5">
              <Globe className="size-3.5" />
              Account Active
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 mt-4 md:mt-0 w-full md:w-auto flex flex-col items-center md:items-end gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/jpeg, image/png, image/webp" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full md:w-auto px-6 py-3 btn-metallic text-xs uppercase tracking-[2px] font-bold flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Uploading
              </>
            ) : (
              <>
                <Upload className="size-3.5 text-primary group-hover:-translate-y-0.5 transition-transform" />
                Upload Image
              </>
            )}
          </button>
          
          <div className="text-[10px] text-secondary/60 text-center md:text-right mt-1 w-full max-w-[200px]">
             JPEG, PNG, or WebP. <br className="hidden md:block" />Max 5MB.
          </div>
          {uploadError && (
             <p className="text-[10px] text-arcana-danger font-bold uppercase tracking-wider text-center md:text-right w-full mt-1">
               {uploadError}
             </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Identity Details */}
        <div className="rounded-sm bg-surface-container-high border border-outline p-6 w-full min-w-0">
          <h3 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-6 flex items-center gap-2">
            <User className="size-3.5 text-primary" />
            Identity Details
          </h3>
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
              <div className="w-full min-w-0">
                <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 ml-1">First Name</label>
                <input
                  type="text"
                  defaultValue={user.firstName}
                  className="w-full min-w-0 px-4 py-3 rounded-sm bg-surface-container border border-outline text-on-surface text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div className="w-full min-w-0">
                <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 ml-1">Last Name</label>
                <input
                  type="text"
                  defaultValue={user.lastName}
                  className="w-full min-w-0 px-4 py-3 rounded-sm bg-surface-container border border-outline text-on-surface text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
            <div className="w-full min-w-0">
              <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 ml-1">Email Connection</label>
              <div className="relative w-full min-w-0">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-secondary/50" />
                <input
                  type="email"
                  defaultValue={user.email}
                  disabled
                  className="w-full min-w-0 pl-11 pr-4 py-3 rounded-sm bg-on-surface/5 border border-outline text-secondary text-sm cursor-not-allowed opacity-70 truncate"
                />
              </div>
              <p className="text-[10px] text-secondary mt-2.5 ml-1 leading-relaxed">
                Your email is currently synchronized with your OAuth identity provider. 
              </p>
            </div>
            <div className="pt-2">
              <button disabled className="px-5 py-2.5 rounded-sm border border-outline text-on-surface/50 text-xs font-bold uppercase tracking-[1px] hover:bg-white/5 transition-colors cursor-not-allowed">
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Security & Access */}
        <div className="rounded-sm bg-surface-container-high border border-outline p-6 flex flex-col w-full min-w-0">
          <h3 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-6 flex items-center gap-2">
            <Shield className="size-3.5 text-primary" />
            Security & Access
          </h3>
          
          <div className="flex-1 space-y-4 w-full">
            <div className="flex items-start justify-between gap-4 p-4 rounded-sm border border-outline bg-surface-container hover:border-primary/30 transition-colors group cursor-pointer w-full min-w-0">
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <Key className="size-3.5" /> Password Override
                </h4>
                <p className="text-[11px] text-secondary mt-1 leading-relaxed truncate">Configure a direct login fallback</p>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Edit</span>
            </div>

            <div className="flex items-start justify-between gap-4 p-4 rounded-sm border border-outline bg-surface-container hover:border-primary/30 transition-colors group cursor-pointer w-full min-w-0">
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="size-3.5" /> Sessions & Devices
                </h4>
                <p className="text-[11px] text-secondary mt-1 leading-relaxed truncate">Review active sign-in locations</p>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">View</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
