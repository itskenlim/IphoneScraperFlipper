"use client";

import type { SelectHTMLAttributes } from "react";

type AutoSubmitSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** Dropdown that submits its parent GET form on change (Status / Area filters). */
export function AutoSubmitSelect({ onChange, ...props }: AutoSubmitSelectProps) {
  return (
    <select
      {...props}
      onChange={(e) => {
        onChange?.(e);
        e.currentTarget.form?.requestSubmit();
      }}
    />
  );
}
