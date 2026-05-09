import esbuild from "esbuild";
import { pinoPlugin } from "esbuild-plugin-pino";

const isProduction = process.env.NODE_ENV === "production";

esbuild
  .build({
    entryPoints: ["./src/index.ts"],
    bundle: true,
    outfile: "./dist/index.mjs",
    format: "esm",
    platform: "node",
    sourcemap: !isProduction,
    minify: isProduction,
    plugins: [
      pinoPlugin({
        transport: isProduction ? undefined : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        },
      }),
    ],
    external: [
      "@workspace/api-zod",
      "@workspace/db",
    ],
  })
  .catch((error) => {
    console.error("Build failed:", error);
    process.exit(1);
  });
