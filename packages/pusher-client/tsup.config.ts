import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  minify: true,
  ...options,
}));
