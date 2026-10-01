/**
 * Default JSON pre-loaded into the playground's editor. Deliberately exercises
 * every field type, mask, conditional rule, and repeatable-section behavior the
 * playground is meant to demonstrate, so opening the page for the first time
 * already shows something meaningful.
 */
export const SAMPLE_TEMPLATE_JSON = [
  {
    table: "leads.business_profile",
    formCode: "business_profile",
    title: "Business Profile",
    sections: [
      {
        code: "business_details",
        table: "leads.business_profile",
        title: "Business Details",
        columns: 2,
        fields: [
          {
            name: "companyName",
            type: "text",
            label: "Company Name",
            path: "business.legalName",
            required: true,
            maxLength: 255,
            span: 2,
          },
          {
            name: "companyType",
            type: "select",
            label: "Company Type",
            path: "business.companyType",
            required: true,
            options: [
              { label: "Private Limited", value: "PVT_LTD" },
              { label: "Partnership", value: "PARTNERSHIP" },
              { label: "Sole Proprietorship", value: "SOLE_PROP" },
            ],
          },
          {
            name: "incorporationDate",
            type: "date",
            label: "Incorporation Date",
            path: "business.incorporationDate",
            required: true,
          },
          {
            name: "businessPan",
            type: "text",
            label: "Business PAN",
            path: "business.pan",
            placeholder: "ABCDE1234F",
            mask: { pattern: "AAAAA-0000-A", transform: "uppercase" },
            validation: {
              required: true,
              pattern: "^[A-Z]{5}[0-9]{4}[A-Z]{1}$",
              message: "Enter a valid PAN (e.g. ABCDE1234F)",
            },
          },
          {
            name: "mobileNumber",
            type: "tel",
            label: "Mobile Number",
            path: "business.mobile",
            prefix: "+91",
            placeholder: "987-9876-098",
            mask: { pattern: "000-0000-000" },
            validation: {
              required: true,
              pattern: "^[6-9][0-9]{9}$",
              message: "Enter a valid 10-digit mobile number",
            },
          },
          {
            name: "contactEmail",
            type: "email",
            label: "Contact Email",
            path: "business.email",
            required: true,
          },
          {
            name: "annualRevenue",
            type: "number",
            label: "Annual Revenue (₹)",
            path: "business.annualRevenue",
            suffix: "INR",
            validation: { min: 0, max: 100000000, integer: true },
          },
          {
            name: "gstRegistered",
            type: "radio",
            label: "GST Registered?",
            path: "business.gstRegistered",
            required: true,
            options: [
              { label: "Yes", value: "YES" },
              { label: "No", value: "NO" },
            ],
          },
          {
            name: "gstin",
            type: "text",
            label: "GSTIN",
            path: "business.gstin",
            placeholder: "22AAAAA0000A1Z5",
            span: 2,
            rules: {
              visibleWhen: { field: "gstRegistered", operator: "equals", value: "YES" },
              requiredWhen: { field: "gstRegistered", operator: "equals", value: "YES" },
            },
            validation: {
              pattern: "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$",
              message: "Enter a valid 15-character GSTIN",
            },
          },
          {
            name: "businessDescription",
            type: "textarea",
            label: "Business Description",
            path: "business.description",
            placeholder: "Briefly describe what the business does…",
            maxLength: 500,
            span: 2,
          },
            {
              name: "termsAccepted",
              type: "checkbox",
              label: "I confirm the above details are accurate",
              path: "business.termsAccepted",
              required: true,
              span: 2,
            },
            {
              name: "registeredAddress",
              type: "address",
              label: "Registered Address",
              path: "business.address",
              required: true,
              span: 2,
            },
            {
              name: "leadSource",
            type: "hidden",
            label: "Lead Source",
            path: "business.leadSource",
            defaultValue: "dev-playground",
          },
        ],
      },
      {
        code: "owners",
        title: "Owner Details",
        description: "Add one entry per business owner or partner.",
        repeatable: true,
        minInstances: 1,
        maxInstances: 5,
        columns: 2,
        fields: [
          {
            name: "ownerName",
            type: "text",
            label: "Owner Name",
            path: "owner.name",
            required: true,
            maxLength: 120,
          },
          {
            name: "ownerPan",
            type: "text",
            label: "Owner PAN",
            path: "owner.pan",
            mask: { pattern: "AAAAA-0000-A", transform: "uppercase" },
            validation: {
              required: true,
              pattern: "^[A-Z]{5}[0-9]{4}[A-Z]{1}$",
            },
          },
          {
            name: "ownershipPercentage",
            type: "percentage",
            label: "Ownership %",
            path: "owner.ownershipPercentage",
            validation: { required: true, min: 0, max: 100 },
          },
          {
            name: "panCard",
            type: "file",
            label: "PAN Card Upload",
            path: "owner.panDocument",
            accept: ".pdf,.jpg,.png",
            maxFiles: 1,
            maxSize: 5,
          },
        ],
      },
    ],
  },
  {
    table: "leads.documents",
    formCode: "documents",
    title: "Documents",
    sections: [
      {
        code: "kyc_documents",
        title: "KYC Documents",
        columns: 2,
        fields: [
          {
            name: "addressProof",
            type: "file",
            label: "Address Proof",
            path: "documents.addressProof",
            required: true,
            accept: ".pdf,.jpg,.png",
            maxFiles: 1,
            maxSize: 5,
          },
          {
            name: "bankStatement",
            type: "document",
            label: "Bank Statement (Last 6 months)",
            path: "documents.bankStatement",
            accept: ".pdf",
            maxFiles: 6,
            maxSize: 10,
          },
          {
            documentType: "OTHER",
            label: "Other Supporting Documents",
            description: "Upload any additional documents requested during the loan review process.",
            required: false,
            upload: {
              allowedExtensions: ["pdf", "jpg", "jpeg", "png", "doc", "docx"],
              maxFileSizeMB: 10,
              minFiles: 0,
              maxFiles: 10,
            },
          },
        ],
      },
    ],
  },
];

/**
 * Sample new format template (v1.0) for testing.
 * This is dynamically imported from the application-template-new.json file.
 * When pasted into the playground, it is automatically detected and converted
 * to the old format by the mapper.
 */
export async function getSampleNewFormatTemplate() {
  try {
    const module = await import("../../../application-template-new.json");
    return module.default;
  } catch {
    return null;
  }
}
