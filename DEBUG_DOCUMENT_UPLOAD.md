# Document Upload & PATCH API Debugging Guide

## Issue
After file upload to `http://leads-services.local/api/files?applicationId=...`, the PATCH API call with DocumentProperty was not happening.

## Solution
Added comprehensive console logging to trace the entire flow from file upload to PATCH API call.

## Files Modified

### 1. `src/components/forms/FileUploadField.tsx`
Added detailed logging at each step:
- When upload starts
- When upload succeeds
- When `publish()` is called
- When `notifyWizard()` is called (which triggers PATCH)

**Key log messages to watch:**
```
[FileUploadField] Starting upload for: {filename} applicationId: {id}
[FileUploadField] ✓ Upload succeeded for: {filename}
[FileUploadField] ✓ Calling publish() after upload success
[FileUploadField] ✓✓✓ notifyWizard called
[FileUploadField]   syncFormToWizard: {true/false}
[FileUploadField]   persistDocumentStep: {true/false}
[FileUploadField] ✓ calling persistDocumentStep in microtask
```

### 2. `src/features/loan-application/FormWizard.tsx`
Added detailed logging to the `persistDocumentStep` callback:
- Current step and template info
- Whether template has DocumentProperty type
- Whether step data exists
- Success/failure of PATCH API call

**Key log messages to watch:**
```
[persistDocumentStep] Called! currentStep: {n} templates length: {n}
[persistDocumentStep] template: {code} propertyType: {type}
[persistDocumentStep] ✓ Calling saveDraft with template: {code}
[persistDocumentStep] ✓ saveDraft succeeded
[persistDocumentStep] ✗ saveDraft error: {error}
```

## Testing Steps

1. **Open browser DevTools console** (F12)
2. **Navigate to a Loan Application wizard** with a document upload step
3. **Upload a file** and watch the console logs
4. **Expected flow:**
   ```
   [FileUploadField] Starting upload for: document.pdf
   ↓
   [FileUploadField] ✓ Upload succeeded for: document.pdf
   ↓
   [FileUploadField] ✓ Calling publish() after upload success
   ↓
   [FileUploadField] ✓✓✓ notifyWizard called
   [FileUploadField]   syncFormToWizard: true
   [FileUploadField]   persistDocumentStep: true
   ↓
   [FileUploadField] ✓ calling persistDocumentStep in microtask
   ↓
   [persistDocumentStep] Called! currentStep: X
   [persistDocumentStep] template: document propertyType: DocumentProperty
   [persistDocumentStep] ✓ Calling saveDraft with template: document
   ↓
   (Network tab shows PATCH /api/applications/{id})
   ↓
   [persistDocumentStep] ✓ saveDraft succeeded
   ```

## What to Check If It Doesn't Work

### If `notifyWizard` is not being called:
- Check if `syncFormToWizard` is `false` → The `SyncFormToWizardProvider` might not be wrapping `FileUploadField`
- Check if `persistDocumentStep` is `false` → The `PersistDocumentStepProvider` might not be wrapping the component
- Check if `applicationId` is null → The `ApplicationIdProvider` might not be wrapping the component

### If `persistDocumentStep` is called but returns early:
- Check the template's `propertyType` — it should be exactly `"DocumentProperty"`
- Check if `stepData` is `undefined` — the form data might not be properly synced

### If PATCH API call fails:
- Check the Network tab for the actual error response
- Check `[persistDocumentStep] ✗ saveDraft error:` in console for error details

## PATCH API Call Details

When successful, the PATCH call should:
- **Method**: PATCH
- **URL**: `/api/applications/{applicationId}`
- **Body**: Array of `ApplicationProperty` objects with `type: "DocumentProperty"`
- **Example body**:
  ```json
  [
    {
      "type": "DocumentProperty",
      "name": "documents",
      "access": {},
      "value": [
        {
          "id": "file-uuid",
          "fileName": "document.pdf",
          "contentType": "application/pdf",
          "status": "AVAILABLE",
          "uploadedAt": "2026-09-30",
          "type": "BUSINESS_PAN",
          "meta": {
            "folderId": "folder-id",
            "sizeBytes": 12345,
            "checksum": "abc123",
            "ownerId": "owner-id"
          }
        }
      ]
    }
  ]
  ```

## Removing Logging Later

Once debugging is complete, remove the `console.log` statements from:
1. `FileUploadField.tsx` - lines with `[FileUploadField]` prefix
2. `FormWizard.tsx` - lines with `[persistDocumentStep]` prefix

Or run: `grep -n "console.log.*\[FileUploadField\]" src/components/forms/FileUploadField.tsx`
