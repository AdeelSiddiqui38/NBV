/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["pdfkit", "tesseract.js", "tesseract.js-core"],
    // tesseract.js spawns a worker_thread via a dynamic path.join() at runtime, and its
    // WASM engine (tesseract.js-core) is loaded the same dynamic way — the serverless output
    // tracer can't follow either statically, so both packages must be force-included or the
    // scan request hangs/crashes once deployed.
    outputFileTracingIncludes: {
      "/api/clients/**": ["./node_modules/tesseract.js/**/*", "./node_modules/tesseract.js-core/**/*"],
    },
  },
};
