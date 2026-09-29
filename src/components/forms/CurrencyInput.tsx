"use client";

import React from "react";
import { NumericFormat } from "react-number-format";
import type { FormField } from "@/types";
import { Input } from "@/components/ui/input";
import {
  isCurrencyValueAllowed,
  resolveCurrencyFormat,
} from "@/utils/currency-format";

interface CurrencyInputProps {
  field: FormField;
  id: string;
  value: unknown;
  onChange: (value: number | "") => void;
  onBlur: () => void;
  inputRef: React.Ref<HTMLInputElement>;
  error?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}

export function CurrencyInput({
  field,
  id,
  value,
  onChange,
  onBlur,
  inputRef,
  error,
  disabled,
  readOnly,
  placeholder,
}: CurrencyInputProps) {
  const format = resolveCurrencyFormat(field);

  return (
    <NumericFormat
      customInput={Input}
      getInputRef={inputRef}
      id={id}
      className="rounded-sm"
      error={error}
      disabled={disabled}
      readOnly={readOnly}
      placeholder={placeholder}
      startAdornment={<span className="text-xs font-medium">₹</span>}
      thousandSeparator={format.useGrouping ? format.thousandSeparator : false}
      decimalSeparator={format.decimalSeparator}
      decimalScale={format.decimalScale}
      fixedDecimalScale={format.fixedDecimalScale}
      allowNegative={format.allowNegative}
      allowLeadingZeros={format.allowLeadingZeros}
      value={value === "" || value === undefined || value === null ? "" : (value as string | number)}
      onValueChange={(values) => {
        onChange(values.floatValue === undefined ? "" : values.floatValue);
      }}
      onBlur={onBlur}
      isAllowed={(values) => isCurrencyValueAllowed(values, format, field.validation?.max)}
    />
  );
}
