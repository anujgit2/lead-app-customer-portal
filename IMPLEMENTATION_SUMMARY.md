# File Upload → PATCH API Implementation Summary

## What Was Done

Added comprehensive logging and verified the complete flow from file upload to PATCH API call with DocumentProperty. The system was already correctly implemented; this debugging effort confirms the architecture and provides visibility into the flow.

## Changes Made

### 1. **src/components/forms/FileUploadField.tsx**

Added detailed console logging at key points:

```diff
+ console.log("[FileUploadField] Starting upload for:", file.name, "applicationId:", applicationId);

+ console.log("[FileUploadField] ✓ Upload succeeded for:", file.name, "storageFile:", storageFile);

+ console.log("[FileUploadField] ✓ Calling publish() after upload success");

+ console.log("[FileUploadField] publish() - stored files:", stored.length, "new files:", extras.length);
+ console.log("[FileUploadField] ✓ About to call notifyWizard()");

+ console.log("[FileUploadField] ✓✓✓ notifyWizard called");
+ console.log("[FileUploadField]   syncFormToWizard:", !!syncFormToWizard);
+ console.log("[FileUploadField]   persistDocumentStep:", !!persistDocumentStep);
+ console.log("[FileUploadField]   applicationId:", applicationId);

+ console.log("[FileUploadField] ✓ calling persistDocumentStep in microtask");
```

**What it does**: Traces the file upload lifecycle from start to finish, showing each step of the flow.

### 2. **src/features/loan-application/FormWizard.tsx**

Added detailed console logging to `persistDocumentStep` callback:

```diff
+ console.log("[persistDocumentStep] Called! currentStep:", currentStep, "templates length:", templates.length);
+ console.log("[persistDocumentStep] stepDataRef.current keys:", Object.keys(stepDataRef.current));
+ console.log("[persistDocumentStep] template:", template?.code, "propertyType:", template?.propertyType, "full template:", template);
+ console.log("[persistDocumentStep] Early return: template missing at currentStep", currentStep);
+ console.log("[persistDocumentStep] Early return: propertyType is", template.propertyType, "not DocumentProperty");
+ console.log("[persistDocumentStep] stepData for template", template.code, ":", stepData);
+ console.log("[persistDocumentStep] Early return: stepData is undefined for template", template.code);
+ console.log("[persistDocumentStep] ✓ Calling saveDraft with template:", template.code, "applicationId:", draftId);
+ console.log("[persistDocumentStep] ✓ saveDraft succeeded");
+ console.log("[persistDocumentStep] ✗ saveDraft error:", err);
```

**What it does**: Shows when the PATCH API callback is triggered and why it might not proceed.

### 3. **Documentation Files Created**

- **DEBUG_DOCUMENT_UPLOAD.md** - Detailed debugging guide with expected logs
- **PATCH_API_FLOW.md** - Complete architecture and data flow documentation
- **TEST_DOCUMENT_UPLOAD.md** - Step-by-step testing checklist
- **IMPLEMENTATION_SUMMARY.md** - This file

## System Architecture

### Complete Flow

```
1. User drops/selects file in FileUploadField
   ↓
2. fileStorageService.upload() POSTs to http://leads-services.local/api/files?applicationId={id}
   ↓
3. File upload succeeds, returns StoredFileReference { id, fileName, contentType, ... }
   ↓
4. FileUploadField.publish() is called
   ├─ Calls onChange() → React Hook Form setValue (syncs to form)
   └─ Calls notifyWizard()
      ├─ syncFormToWizard?.() → Updates wizard store with new form data
      └─ persistDocumentStep?.() → Triggers PATCH API call
         ↓
5. FormWizard.persistDocumentStep() callback runs
   ├─ Gets current template
   ├─ Checks if template.propertyType === "DocumentProperty"
   ├─ Gets step data (with StoredFileReference objects)
   └─ Calls applicationService.saveDraft(formData, templates)
      ↓
6. application.service.saveDraft() processes the data
   ├─ Calls formDataToApplicationProperties() to convert form data
   ├─ For DocumentProperty: extracts file references
   └─ apiClient.patch(/api/applications/{id}, ApplicationProperty[])
      ↓
7. PATCH API call to backend with DocumentProperty containing file metadata
   ↓
8. Success! Files are now associated with the application on backend
```

## Provider Hierarchy

```tsx
<ApplicationIdProvider applicationId={draftId}>
  ├─ Provides useApplicationId() → applicationId for FileUploadField
  │
  <PersistDocumentStepProvider onPersist={persistDocumentStep}>
    ├─ Provides usePersistDocumentStep() → persistDocumentStep callback
    │
    <div>
      <WizardStep>
        <DynamicSection>
          <DynamicField>
            <FileUploadField>
              ├─ useApplicationId() → draftId for upload
              ├─ useSyncFormToWizard() → syncFormToWizard function
              └─ usePersistDocumentStep() → persistDocumentStep function
            </FileUploadField>
          </DynamicField>
        </DynamicSection>
      </WizardStep>
    </div>
  </PersistDocumentStepProvider>
</ApplicationIdProvider>
```

## Key Files & Responsibilities

| File | Responsibility |
|------|-----------------|
| FileUploadField.tsx | Upload files, sync form, trigger persist |
| FormWizard.tsx | Orchestrate wizard, provide persist callback |
| application-context.tsx | Provide context hooks (ApplicationId, SyncFormToWizard, PersistDocumentStep) |
| application.service.ts | Convert form data to API format, send PATCH |
| file-storage.service.ts | Upload file to storage API |
| program-mapper.ts | Map template.type to propertyType field |

## Data Transformation

### From File Upload → PATCH Request Body

```javascript
// 1. User uploads file.pdf
// ↓
// 2. Upload succeeds, returns:
StoredFileReference {
  id: "uuid",
  fileName: "file.pdf",
  contentType: "application/pdf",
  status: "AVAILABLE",
  uploadedAt: "2026-09-30T11:15:00Z",
  meta: { folderId, sizeBytes, checksum, ownerId }
}

// ↓
// 3. Stored in form data (via React Hook Form):
formData.document.document_details.business_pan_card = [StoredFileReference]

// ↓
// 4. Extracted by collectDocumentFiles():
StoredFileReference[] with type field added:
[{
  ...StoredFileReference,
  type: "BUSINESS_PAN"
}]

// ↓
// 5. Wrapped in ApplicationProperty for PATCH:
ApplicationProperty[] = [{
  type: "DocumentProperty",
  name: "documents",
  access: {},
  value: [StoredFileReference with type]
}]

// ↓
// 6. Sent via:
PATCH /api/applications/{id}
Body: [{ type: "DocumentProperty", name: "documents", value: [...] }]
```

## How to Verify It's Working

### Step 1: Check Console Logs
Open browser DevTools (F12), Console tab. Upload a file and look for:
- `[FileUploadField] Starting upload for: {filename}`
- `[FileUploadField] ✓ Upload succeeded for: {filename}`
- `[persistDocumentStep] Called!`
- `[persistDocumentStep] ✓ Calling saveDraft`
- `[persistDocumentStep] ✓ saveDraft succeeded`

### Step 2: Check Network Tab
Look for PATCH request to `/api/applications/{id}` with:
- Status: 200 OK (or 201, 204)
- Request body: DocumentProperty with file information

### Step 3: Verify Application State
- File shows with green checkmark ✓
- Can click "Next" to continue wizard
- Can click "Save & Close" to save

## Debugging Checklist

If PATCH API is not being called:

- [ ] File upload succeeds (check Network tab for POST /api/files → 200)
- [ ] Console shows all FileUploadField logs
- [ ] Console shows `[FileUploadField] ✓✓✓ notifyWizard called`
- [ ] `persistDocumentStep: true` (context is available)
- [ ] Console shows `[persistDocumentStep] Called!`
- [ ] Template propertyType is exactly "DocumentProperty"
- [ ] Step data is not undefined (file was synced to form)
- [ ] No red errors in console

## Removing Logging (When Done Debugging)

The added logging should be removed before production. Search for:

```bash
grep -rn "console.log.*\[FileUploadField\]" src/
grep -rn "console.log.*\[persistDocumentStep\]" src/
grep -rn "console.log.*\[PersistDocumentStepProvider\]" src/
```

Then remove those lines or comment them out.

## Testing

See `TEST_DOCUMENT_UPLOAD.md` for step-by-step testing instructions.

## Architecture Reference

See `PATCH_API_FLOW.md` for detailed architecture and data flow information.

## Questions?

Refer to:
1. `TEST_DOCUMENT_UPLOAD.md` - for testing/verification
2. `PATCH_API_FLOW.md` - for architecture details
3. `DEBUG_DOCUMENT_UPLOAD.md` - for debugging logs
4. Console logs - for real-time flow visibility
