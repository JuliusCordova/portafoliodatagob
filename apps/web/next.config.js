/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: process.env.WEB_HOST
    ? [`3000-${process.env.WEB_HOST}`]
    : [],
};

module.exports = nextConfig;
