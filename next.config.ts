import type { NextConfig } from 'next';
const config: NextConfig = {
  // Keep public acceptance builds separate from the member-enabled local
  // validation server's .next output.
  distDir: process.env.IDEALAB_ISOLATED_ACCEPTANCE_BUILD === 'true' ? '.next-acceptance'
    : process.env.IDEALAB_ISOLATED_RECOVERY_DEV === 'true' ? '.next-recovery' : '.next',
  poweredByHeader: false,
  devIndicators: false,
  // OAuth codes arrive in callback URLs. Keep development request and server
  // function logging from persisting credentials or private form details.
  logging: false,
  images: { formats: ['image/webp', 'image/avif'] },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }, { source: '/auth/:path*', headers: [
      { key: 'Referrer-Policy', value: 'no-referrer' },
    ] }];
  },
};
export default config;
