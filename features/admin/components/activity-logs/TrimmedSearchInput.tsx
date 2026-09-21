"use client";

import type { InputHTMLAttributes } from "react";

export function TrimmedSearchInput(
  props: InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      {...props}
      onInput={(event) => {
        event.currentTarget.value = event.currentTarget.value.replace(/^\s+/, "");
        props.onInput?.(event);
      }}
    />
  );
}
