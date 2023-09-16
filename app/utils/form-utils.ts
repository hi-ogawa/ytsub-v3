// move to tiny-form?
export const numberFieldTransform = {
  toValue: (v: number) => (Number.isFinite(v) ? String(v) : ""),
  fromValue: (v: string) => Number.parseFloat(v),
};
