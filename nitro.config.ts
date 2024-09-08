//https://nitro.unjs.io/config

export default defineNitroConfig({
  preset: "bun",
  node: true,
  inlineDynamicImports: true,
  serveStatic: "inline",
  esbuild: {
    options: {
      target: "esnext",
    },
  },
  srcDir: "server",
  experimental: {
    websocket: true,
  },
});
