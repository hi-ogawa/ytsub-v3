import fs from "node:fs";
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
  transformers: [transformerDirectives(), transformerVariantGroup()],
});
