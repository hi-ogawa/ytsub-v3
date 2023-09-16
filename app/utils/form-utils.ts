import type React from "react";

// forcing controled input value is tricky in general
// cf.
// https://github.com/solidjs/solid/issues/1756
// https://technology.blog.gov.uk/2020/02/24/why-the-gov-uk-design-system-team-changed-the-input-type-for-numbers/

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
