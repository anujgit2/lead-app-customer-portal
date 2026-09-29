import type { FieldOption, FormField } from "@/types";

export const PINCODE_PATTERN = "^[1-9][0-9]{5}$";

export const INDIAN_STATES: FieldOption[] = [
  { label: "Andhra Pradesh", value: "Andhra Pradesh" },
  { label: "Arunachal Pradesh", value: "Arunachal Pradesh" },
  { label: "Assam", value: "Assam" },
  { label: "Bihar", value: "Bihar" },
  { label: "Chhattisgarh", value: "Chhattisgarh" },
  { label: "Goa", value: "Goa" },
  { label: "Gujarat", value: "Gujarat" },
  { label: "Haryana", value: "Haryana" },
  { label: "Himachal Pradesh", value: "Himachal Pradesh" },
  { label: "Jharkhand", value: "Jharkhand" },
  { label: "Karnataka", value: "Karnataka" },
  { label: "Kerala", value: "Kerala" },
  { label: "Madhya Pradesh", value: "Madhya Pradesh" },
  { label: "Maharashtra", value: "Maharashtra" },
  { label: "Manipur", value: "Manipur" },
  { label: "Meghalaya", value: "Meghalaya" },
  { label: "Mizoram", value: "Mizoram" },
  { label: "Nagaland", value: "Nagaland" },
  { label: "Odisha", value: "Odisha" },
  { label: "Punjab", value: "Punjab" },
  { label: "Rajasthan", value: "Rajasthan" },
  { label: "Sikkim", value: "Sikkim" },
  { label: "Tamil Nadu", value: "Tamil Nadu" },
  { label: "Telangana", value: "Telangana" },
  { label: "Tripura", value: "Tripura" },
  { label: "Uttar Pradesh", value: "Uttar Pradesh" },
  { label: "Uttarakhand", value: "Uttarakhand" },
  { label: "West Bengal", value: "West Bengal" },
  { label: "Andaman and Nicobar Islands", value: "Andaman and Nicobar Islands" },
  { label: "Chandigarh", value: "Chandigarh" },
  { label: "Dadra and Nagar Haveli and Daman and Diu", value: "Dadra and Nagar Haveli and Daman and Diu" },
  { label: "Delhi", value: "Delhi" },
  { label: "Jammu and Kashmir", value: "Jammu and Kashmir" },
  { label: "Ladakh", value: "Ladakh" },
  { label: "Lakshadweep", value: "Lakshadweep" },
  { label: "Puducherry", value: "Puducherry" },
];

export const COUNTRY_OPTIONS: FieldOption[] = [
  { label: "India", value: "India" },
  { label: "United Arab Emirates", value: "United Arab Emirates" },
  { label: "United Kingdom", value: "United Kingdom" },
  { label: "United States", value: "United States" },
  { label: "Singapore", value: "Singapore" },
];

export const ADDRESS_VALUE_KEYS = [
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "pincode",
  "country",
] as const;

export type AddressValue = Record<(typeof ADDRESS_VALUE_KEYS)[number], string>;

export function getAddressSubfields(opts: {
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
} = {}): FormField[] {
  const required = opts.required !== false;

  const fields: FormField[] = [
    {
      name: "addressLine1",
      label: "Address Line 1",
      type: "text",
      placeholder: "Building name, street",
      validation: { required, maxLength: 200 },
    },
    {
      name: "addressLine2",
      label: "Address Line 2",
      type: "text",
      placeholder: "Area, locality",
      validation: { maxLength: 200 },
    },
    {
      name: "city",
      label: "City",
      type: "text",
      placeholder: "City",
      validation: { required, maxLength: 100 },
    },
    {
      name: "state",
      label: "State",
      type: "select",
      placeholder: "Select state",
      options: INDIAN_STATES,
      validation: { required },
    },
    {
      name: "pincode",
      label: "PIN Code",
      type: "text",
      placeholder: "400001",
      validation: {
        required,
        pattern: PINCODE_PATTERN,
        message: "Enter a valid 6-digit PIN code",
      },
    },
    {
      name: "country",
      label: "Country",
      type: "select",
      placeholder: "Select country",
      options: COUNTRY_OPTIONS,
      validation: { required },
    },
  ];

  return fields.map((field) => ({
    ...field,
    disabled: opts.disabled,
    readonly: opts.readonly,
  }));
}

export function emptyAddressValue(): AddressValue {
  return {
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  };
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True when the user hasn't filled any meaningful address details (country default is ignored). */
export function isEmptyAddress(value: unknown): boolean {
  if (!isPlainObject(value)) return true;
  return (["addressLine1", "addressLine2", "city", "state", "pincode"] as const).every((key) => {
    const v = value[key];
    return v === undefined || v === null || v === "";
  });
}

/** Drops blank nested keys so the payload only contains filled address attributes. */
export function normalizeAddressValue(value: unknown): Record<string, string> | undefined {
  if (isEmptyAddress(value) || !isPlainObject(value)) return undefined;
  const nested: Record<string, string> = {};
  for (const key of ADDRESS_VALUE_KEYS) {
    const raw = value[key];
    if (typeof raw === "string" && raw.trim() !== "") nested[key] = raw.trim();
  }
  return Object.keys(nested).length > 0 ? nested : undefined;
}
