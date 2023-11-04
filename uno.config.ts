import { unocssPresetAntd } from "@hiogawa/unocss-preset-antd";
import {
  defineConfig,
  presetIcons,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from "unocss";

export default defineConfig({
  presets: [
    unocssPresetAntd(),
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
        absolute inset-0 grid place-content-center bg-colorBgContainer
        after:(content-empty antd-spin h-${size})
      `,
    ],
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
});
