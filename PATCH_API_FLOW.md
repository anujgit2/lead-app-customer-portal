# Document Upload → PATCH API Flow

## Complete Architecture

The flow from file upload to PATCH API call follows this path:

```
User uploads file
    ↓
FileUploadField (onDrop)
    ↓
fileStorageService.upload()
    ↓ (success)
.then() → publish(nextItems)
    ↓
FileUploadField.publish()
    ├─ onChangeRef.current() [React Hook Form setValue]
    └─ notifyWizard()
        ↓
        ├─ syncFormToWizard?.()  [Updates wizard state]
        ├─ (queueMicrotask)
        └─ persistDocumentStep?.()
            ↓
            FormWizard.persistDocumentStep()
                ├─ Checks if current template is DocumentProperty
                ├─ Gets stepData from stepDataRef
                └─ applicationService.saveDraft()
                    ↓
                    formDataToApplicationProperties()
                    [Converts form data to ApplicationProperty[]]
                    ↓
                    apiClient.patch(/api/applications/{id}, properties)
                    [PATCH with DocumentProperty]
```

## Key Components & Their Responsibilities

### 1. FileUploadField.tsx
**Responsibility**: Handle file uploads and trigger persistence
- Calls `fileStorageService.upload()` to POST file
- On success, calls `publish()` which triggers `notifyWizard()`
- `notifyWizard()` calls `persistDocumentStep?.()` via context

**Context dependencies**:
- `ApplicationIdProvider` → applicationId (from useApplicationId)
- `SyncFormToWizardProvider` → syncFormToWizard (from useSyncFormToWizard)
- `PersistDocumentStepProvider` → persistDocumentStep (from usePersistDocumentStep)

### 2. FormWizard.tsx
**Responsibility**: Orchestrate the entire wizard and handle document persistence
- Creates `ApplicationIdProvider` with draftId
- Creates `PersistDocumentStepProvider` with persistDocumentStep callback
- `persistDocumentStep` callback:
  1. Gets current template
  2. Checks if it's a DocumentProperty template
  3. Gets the step data (with uploaded file references)
  4. Calls `applicationService.saveDraft()` with just that template

### 3. application.service.ts
**Responsibility**: Convert form data to API format and send PATCH request
- `formDataToApplicationProperties()` converts form data to ApplicationProperty[]
- For DocumentProperty templates: calls `collectDocumentFiles()` to extract uploaded files
- `apiClient.patch(/api/applications/{id}, properties)` sends the PATCH request

### 4. application-context.tsx
**Responsibility**: Provide context hooks for components to trigger persistence
- `ApplicationIdContext` → provides applicationId to child components
- `SyncFormToWizardContext` → provides syncFormToWizard callback
- `PersistDocumentStepContext` → provides persistDocumentStep callback

## Provider Nesting

The providers are correctly nested in FormWizard:

```tsx
<ApplicationIdProvider applicationId={draftId}>
  <PersistDocumentStepProvider onPersist={persistDocumentStep}>
    <div>
      ... <WizardStep /> (contains FileUploadField)
    </div>
  </PersistDocumentStepProvider>
</ApplicationIdProvider>
```

This ensures:
1. FileUploadField can access `useApplicationId()` → draftId
2. FileUploadField can access `useSyncFormToWizard()` → syncFormToWizard
3. FileUploadField can access `usePersistDocumentStep()` → persistDocumentStep

## Data Flow: File Upload → PATCH Body

1. **User selects file** → File is uploaded
2. **Upload succeeds** → Returns `StoredFileReference`:
   ```json
   {
     "id": "file-uuid",
     "fileName": "doc.pdf",
     "contentType": "application/pdf",
     "status": "AVAILABLE",
     "uploadedAt": "2026-09-30T...",
     "meta": {
       "folderId": "folder-id",
       "sizeBytes": 12345,
       "checksum": "abc123",
       "ownerId": "owner-id"
     }
   }
   ```

3. **FileUploadField.publish()** is called:
   - Calls `onChange(f.value)` (React Hook Form setValue)
   - Form data now contains: `{ documentType: [StoredFileReference] }`

4. **syncFormToWizard()** updates the wizard store

5. **persistDocumentStep()** extracts the file and builds ApplicationProperty:
   ```json
   [
     {
       "type": "DocumentProperty",
       "name": "documents",
       "access": {},
       "value": [
         {
           "id": "file-uuid",
           "fileName": "doc.pdf",
           "contentType": "application/pdf",
           "status": "AVAILABLE",
           "uploadedAt": "2026-09-30",
           "type": "BUSINESS_PAN",
           "meta": { ... }
         }
       ]
     }
   ]
   ```

6. **PATCH /api/applications/{id}** is called with the body above

## How to Verify It's Working

### Console Logs (added in debugging changes)

Watch for these log messages in browser console:

```
[FileUploadField] Starting upload for: document.pdf applicationId: 123e4567-e89b-12d3-a456-426614174000
[FileUploadField] ✓ Upload succeeded for: document.pdf
[FileUploadField] ✓ Calling publish() after upload success
[FileUploadField] ✓✓✓ notifyWizard called
[FileUploadField]   syncFormToWizard: true
[FileUploadField]   persistDocumentStep: true
[FileUploadField] ✓ calling persistDocumentStep in microtask
[PersistDocumentStepProvider] persist called
[persistDocumentStep] Called! currentStep: 5 templates length: 6
[persistDocumentStep] template: document propertyType: DocumentProperty
[persistDocumentStep] ✓ Calling saveDraft with template: document applicationId: 123e...
[persistDocumentStep] ✓ saveDraft succeeded
```

### Network Tab

Look for a PATCH request to `/api/applications/{id}` with:
- **Method**: PATCH
- **Request body**: Array of ApplicationProperty objects
- **Status**: 200 OK (if successful)

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| No console logs at all | Dev server not running or code not rebuilt | Restart dev server: `npm run dev` |
| `notifyWizard` not called | `SyncFormToWizardProvider` or `PersistDocumentStepProvider` not wrapping field | Check FormWizard.tsx provider structure (line 336) |
| `syncFormToWizard: false` or `persistDocumentStep: false` | Context not provided | Ensure file is inside `<WizardStep>` which is inside providers |
| `persistDocumentStep called but returns early` | Template is not DocumentProperty | Check template's `propertyType` matches exactly |
| `persistDocumentStep called but PATCH not sent` | `stepData` is undefined | Check that form data was properly synced |
| PATCH fails with error | API validation or authentication issue | Check Network tab for error details |

## Implementation Checklist

- [x] FileUploadField.tsx uses `useApplicationId()`, `useSyncFormToWizard()`, `usePersistDocumentStep()`
- [x] FormWizard.tsx wraps children with `ApplicationIdProvider` and `PersistDocumentStepProvider`
- [x] FormWizard.persistDocumentStep checks for DocumentProperty template type
- [x] application.service.saveDraft converts form data to ApplicationProperty[]
- [x] application.service.saveDraft calls apiClient.patch() with the properties
- [x] DocumentProperty templates in JSON have `"type": "DocumentProperty"` in the template.type field

## Next Steps

1. **Verify it's working** by uploading a file and checking console/network
2. **If working** → Remove the console.log statements added for debugging
3. **If not working** → Check the troubleshooting table above
