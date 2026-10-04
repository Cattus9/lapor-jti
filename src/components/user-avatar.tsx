"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarFallback } from "@/lib/avatar-fallback"
import { cn } from "cn"

export function UserAvatar({ user, size = "default", className, fallbackClassName }: {
  user: { name: string; email: string; avatar?: string }
  size?: "default" | "sm" | "lg"
  className?: string
  fallbackClassName?: string
}) {
  const fallback = getAvatarFallback(user.name, user.email)
  return <Avatar size={size} className={className}>
    {user.avatar?.trim() ? <AvatarImage key={user.avatar} src={user.avatar} alt={user.name} /> : null}
    <AvatarFallback className={cn(fallback.colorClassName, "font-semibold", fallbackClassName)} role="img" aria-label={`Avatar ${user.name || user.email || "pengguna"}`}>{fallback.initials}</AvatarFallback>
  </Avatar>
}
