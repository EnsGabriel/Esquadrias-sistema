/** @type {import('next').NextConfig} */

// Funciona no Next 14 e no Next 15 ou superior.
const major = parseInt(require('next/package.json').version.split('.')[0], 10)

const nextConfig =
  major >= 15
    ? { serverExternalPackages: ['@react-pdf/renderer'] }
    : { experimental: { serverComponentsExternalPackages: ['@react-pdf/renderer'] } }

module.exports = nextConfig
