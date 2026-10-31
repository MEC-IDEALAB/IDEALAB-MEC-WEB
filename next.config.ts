import type { NextConfig } from 'next';
const config: NextConfig = {
  // Keep public acceptance builds separate from the member-enabled local
  // validation server's .next output.
  distDir: process.env.IDEALAB_ISOLATED_ACCEPTANCE_BUILD === 'true' ? '.next-acceptance' : '.next',
  poweredByHeader: false,
  devIndicators: false,
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
