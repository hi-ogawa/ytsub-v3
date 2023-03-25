import { antdPreset } from "@hiogawa/unocss-preset-antd";
import {
  defineConfig,
  presetIcons,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from "unocss";

export default defineConfig({
  presets: [
    antdPreset(),
    presetUno(),
    presetIcons({
      extraProperties: {
        display: "inline-block",
      },
    }),
  ],
  shortcuts: [
    [
      /^antd-spin-overlay-(\d+)$/,
      ([, size]) => `
        absolute inset-0 grid place-content-center
        after:(content-none antd-spin h-${size})
      `,
    ],
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
});
