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
  // prettier-ignore
  shortcuts: {
    // TODO: to upstream
    "antd-spin2": "antd-spin aspect-square",
    "antd-btn-ghost-active": "text-colorPrimaryActive border-colorPrimaryActive",
    "antd-menu-item": "antd-btn antd-btn-text",
    "antd-menu-item-active": "important:(text-colorPrimary bg-[var(--antd-controlItemBgActive)] dark:(text-white bg-colorPrimary))",
  },
  preflights: [
    {
      getCSS: () =>
        fs.readFileSync(
          require.resolve("@hiogawa/unocss-preset-antd/dist/reset.css"),
          "utf-8"
        ),
    },
  ],
});
