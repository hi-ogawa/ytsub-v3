import type React from "react";

interface RawProps<T> {
  value: T;
  onChange: (v: T) => void;
}

export function asNumberInputProps(props: RawProps<number>) {
  return {
    ...props,
    value: Number.isFinite(props.value) ? String(props.value) : "", // force string to silence react warning on NaN
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      props.onChange(e.target.valueAsNumber),
  };
}
