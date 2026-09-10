/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 is a native module; keep it out of the bundler.
  serverExternalPackages: ["better-sqlite3"],
  // Persona specs and recorded calls are read from disk at runtime, so they ship with the build.
  outputFileTracingIncludes: {
    "/**": ["./personas/**/*", "./fixtures/**/*"],
  },
};

export default nextConfig;
