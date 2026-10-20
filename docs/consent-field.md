# Consent fields

A `consent` field is one checkbox with its own wording. A section can contain several. Nothing in the wording or the field key is hardcoded: the schema supplies both.

The portal does not write the audit record. It only renders the field and submits `accepted` and `version`. The server owns the timestamp, IP address, and user agent.

## Schema

```json
{
  "key": "dpdpConsent",
  "type": "consent",
  "required": true,
  "visibleIf": { "field": "shareWithBureau", "op": "eq", "value": "YES" },
  "requiredIf": { "anyOf": [{ "field": "shareWithBureau", "op": "eq", "value": "YES" }] },
  "ui": {
    "label": { "en": "Data processing consent", "hi": "डेटा सहमति" },
    "text": { "en": "I consent to the collection and processing of my data." },
    "fullTextUrl": "https://example.com/consent/dpdp",
    "errors": { "required": "This consent is required to proceed" }
  },
  "consent": {
    "version": "1.0",
    "capture": ["timestamp", "ipAddress", "userAgent"],
    "withdrawable": true
  },
  "sensitivity": "INTERNAL"
}
```

`ui.label` and `ui.text` are a string or a map of locale to string. The portal uses the page language (`en` on this app) and falls back to `en`, then `en-IN`, then the first entry.

`visibleIf` and `requiredIf` use the same conditions as other fields: `{ "field", "op": "eq", "value" }` and `{ "anyOf": [...] }` / `{ "allOf": [...] }`. A hidden consent is not validated and is left out of the saved payload.

The checkbox starts unticked. Ticking stores an object. Unticking removes it. An acceptance for a different `consent.version` does not count.

## What the client submits

```json
{ "accepted": true, "version": "1.0" }
```

`timestamp`, `ipAddress`, and `userAgent` are removed even if a previous response left them on the form value. The server must ignore those fields if a client sends them anyway.

## Stored record

Append-only. Withdrawing writes a new row (`accepted: false`, `withdrawnAt` set). It does not edit the original row.

```json
{
  "fieldKey": "dpdpConsent",
  "version": "1.0",
  "textHash": "<sha256 hex of the exact ui.text shown>",
  "locale": "en",
  "accepted": true,
  "timestamp": "2026-10-20T09:00:00.000Z",
  "ipAddress": "<from the request>",
  "userAgent": "<from the request>",
  "userId": "<signed-in user>",
  "applicationId": "<application>",
  "withdrawnAt": null
}
```

`textHash` is SHA-256 of the exact wording string for `locale`, not a trimmed or translated variant. Fill `timestamp`, `ipAddress`, and `userAgent` only when `consent.capture` lists them. `timestamp` is UTC and comes from the server clock.

Treat the row as `sensitivity: INTERNAL`: encrypt it at rest and do not write the wording or the value to plain-text logs.

`consent.withdrawable: true` means a later request may append a withdrawal. Withdrawing a KYC or bureau consent should warn that the related service can no longer continue. That API is not part of this portal.

## Bumping a version

Change `consent.version` in the schema (for example `1.0` to `1.1`) when the wording or the meaning changes. Update `ui.text` in the same change. Previous rows stay in the audit log, and they no longer satisfy the field, so the applicant has to accept the new wording.
