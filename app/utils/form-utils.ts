import type React from "react";

export function asNumberInput(props: {
  name: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return {
    name: props.name,
    // empty input will become NaN
    value: Number.isFinite(props.value) ? String(props.value) : "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      props.onChange(e.target.valueAsNumber),
  };
}
