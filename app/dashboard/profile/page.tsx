"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { authClient } from "@/auth-client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, Lock, Upload, CheckCircle } from "lucide-react";

interface ProfileFormData {
  name: string;
  image: string;
}

interface PasswordResetFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { data: session, isPending } = authClient.useSession();

  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string>("");

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    setValue: setProfileValue,
    formState: { isSubmitting: isProfileSubmitting, errors: profileErrors },
  } = useForm<ProfileFormData>();

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    formState: { isSubmitting: isPasswordSubmitting, errors: passwordErrors },
  } = useForm<PasswordResetFormData>();

  useEffect(() => {
    if (session?.user) {
      setProfileValue("name", session.user.name || "");
      setProfileValue("image", session.user.image || "");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvatarPreview(session.user.image || "");
    }
  }, [session, setProfileValue]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarPreview(base64);
        setProfileValue("image", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const onUpdateProfile = async (data: ProfileFormData) => {
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, image: avatarPreview }),
      });

      if (!res.ok) {
        throw new Error("Failed to update profile picture and name");
      }

      await authClient.updateUser({
        name: data.name,
      });

      setProfileSuccess("Profile updated successfully!");
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const onChangePassword = async (data: PasswordResetFormData) => {
    setPasswordSuccess(null);
    setPasswordError(null);

    if (data.newPassword !== data.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      const { error } = await authClient.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        revokeOtherSessions: true,
      });

      if (error) {
        setPasswordError(error.message || "Failed to reset password.");
      } else {
        setPasswordSuccess("Password changed successfully!");
        resetPasswordForm();
      }
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Password reset failed");
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isPending) {
    return <p className="text-muted-foreground p-4">Loading profile...</p>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal account details, avatar, and security settings
        </p>
      </div>

      {/* Profile Info & Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserIcon className="size-4 text-primary" />
            <span>Personal Information</span>
          </CardTitle>
          <CardDescription>Update your display name and profile picture</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmitProfile(onUpdateProfile)} className="flex flex-col gap-6">
            {profileSuccess && (
              <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600">
                <CheckCircle className="size-4" />
                <AlertDescription>{profileSuccess}</AlertDescription>
              </Alert>
            )}

            {profileError && (
              <Alert variant="destructive">
                <AlertDescription>{profileError}</AlertDescription>
              </Alert>
            )}

            {/* Avatar Section */}
            <div className="flex items-center gap-4 border p-4 rounded-lg bg-muted/20">
              <Avatar className="size-16">
                <AvatarImage src={avatarPreview} alt="Profile Picture" />
                <AvatarFallback className="text-lg">
                  {getInitials(session?.user?.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col gap-2">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" className="gap-2 pointer-events-none">
                    <Upload className="size-4" />
                    <span>Upload Picture</span>
                  </Button>
                </Label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <span className="text-xs text-muted-foreground">
                  JPG, PNG, GIF, or WEBP up to 5MB
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                {...registerProfile("name", {
                  required: "Display Name is required",
                  minLength: { value: 2, message: "Name must be at least 2 characters" },
                })}
              />
              {profileErrors.name && (
                <p className="text-xs text-destructive">{profileErrors.name.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={session?.user?.email || ""}
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
              <span className="text-xs text-muted-foreground">Email cannot be changed</span>
            </div>

            <Button type="submit" disabled={isProfileSubmitting} className="w-fit">
              {isProfileSubmitting ? "Saving..." : "Save Profile Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security & Password Reset */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="size-4 text-primary" />
            <span>Security & Password</span>
          </CardTitle>
          <CardDescription>Change or reset your password</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmitPassword(onChangePassword)} className="flex flex-col gap-4">
            {passwordSuccess && (
              <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600">
                <CheckCircle className="size-4" />
                <AlertDescription>{passwordSuccess}</AlertDescription>
              </Alert>
            )}

            {passwordError && (
              <Alert variant="destructive">
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="••••••••"
                {...registerPassword("currentPassword", {
                  required: "Current Password is required",
                })}
              />
              {passwordErrors.currentPassword && (
                <p className="text-xs text-destructive">{passwordErrors.currentPassword.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                {...registerPassword("newPassword", {
                  required: "New Password is required",
                  minLength: { value: 6, message: "Password must be at least 6 characters" },
                })}
              />
              {passwordErrors.newPassword && (
                <p className="text-xs text-destructive">{passwordErrors.newPassword.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...registerPassword("confirmPassword", {
                  required: "Please confirm your new password",
                })}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-xs text-destructive">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isPasswordSubmitting} className="w-fit mt-2">
              {isPasswordSubmitting ? "Changing Password..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
