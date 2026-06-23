/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["pdfkit", "tesseract.js"],
    // tesseract.js spawns a worker_thread via a dynamic path.join() at runtime, which the
    // serverless output tracer can't follow statically — without this, the worker script
    // is missing from the deployed bundle and the scan request hangs until Vercel kills it.
    outputFileTracingIncludes: {
      "/api/clients/**": ["./node_modules/tesseract.js/**/*"],
    },
  },
};
