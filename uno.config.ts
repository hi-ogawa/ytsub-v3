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
  theme: {
    // cf. https://github.com/unocss/unocss/blob/339f2b2c9be41a5505e7f4509eea1cf00a87a8d1/packages/preset-wind/src/theme.ts#L19
    animation: {
      keyframes: {
        // make `spin` in a sense that `translate-xxx` utility can be used at the same time
        "spin-composable": `{
          from { transform: translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) rotate(0deg); }
          to   { transform: translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) rotate(360deg); }
        }`,
      },
      counts: {
        "spin-composable": "infinite",
      },
    },
  },
  // TODO: upstream?
  shortcuts: [
    {
      "antd-btn-loading":
        "relative after:(content-none absolute antd-spin animate-spin-composable h-4 top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%])",
    },
    // TODO: it doesn't feel like right abstraction.
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
