import React from "react";
import { LogoMotion } from "./logo-motion";
export function LoginGlow({ compact = false }: { compact?: boolean }) {
  return <LogoMotion size={compact ? 44 : 64} testID="login-logo-glow" />;
}
