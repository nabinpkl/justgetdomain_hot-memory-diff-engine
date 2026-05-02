import { execSync } from "node:child_process";
import type { NextConfig } from "next";

function resolveGitSha(): string {
  // Override path for environments without a git binary (some CI runners,
  // scratch debugging). The Dockerfile installs git and copies .git, so the
  // execSync path resolves cleanly during `docker compose build`.
  if (process.env.GIT_SHA) return process.env.GIT_SHA;
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  ...(process.env.DOCKER_BUILD ? { output: "standalone" as const } : {}),
  env: {
    NEXT_PUBLIC_GIT_SHA: resolveGitSha(),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL ?? "http://localhost:8000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
