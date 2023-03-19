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
  shortcuts: {
    // TODO: to upstream
    "antd-menu-item": "antd-btn antd-btn-text",
    "antd-menu-item-active":
      "important:(text-colorPrimary bg-[var(--antd-controlItemBgActive)] dark:(text-white bg-colorPrimary))",
  },
});
