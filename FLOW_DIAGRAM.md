# File Upload → PATCH API Flow Diagram

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER UPLOADS FILE                                │
│                                                                     │
│   FileUploadField (drag-drop area)                                  │
│   └─ User drops file.pdf                                            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   FILE UPLOAD (POST)                                │
│                                                                     │
│   fileStorageService.upload()                                       │
│   └─ POST http://leads-services.local/api/files?applicationId=X    │
│      ├─ Request: FormData with file                                │
│      └─ Response: StoredFileReference with metadata                │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ↓ (success)
┌─────────────────────────────────────────────────────────────────────┐
│              FORM DATA SYNCHRONIZATION                              │
│                                                                     │
│   FileUploadField.publish()                                         │
│   ├─ onChange(files) → React Hook Form setValue                     │
│   │  └─ Updates form data with StoredFileReference[]               │
│   └─ notifyWizard()                                                │
│      ├─ syncFormToWizard?.()                                       │
│      │  └─ Updates useWizardStore with form data                   │
│      └─ persistDocumentStep?.()  [microtask]                       │
│         └─ Triggers PATCH API call                                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────────┐
│            DOCUMENT PERSISTENCE (PATCH API)                         │
│                                                                     │
│   FormWizard.persistDocumentStep()                                  │
│   ├─ Check: Current template is DocumentProperty? ✓               │
│   ├─ Get: Step data with uploaded files ✓                         │
│   └─ Call: applicationService.saveDraft()                          │
│      ├─ formDataToApplicationProperties()                          │
│      │  └─ Convert form data to ApplicationProperty[]              │
│      └─ apiClient.patch(/api/applications/{id}, properties)        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────────┐
│                 BACKEND PERSISTS FILES                              │
│                                                                     │
│   API Response: 200 OK                                              │
│   └─ Files are now associated with application                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
FormWizard
├─ ApplicationIdProvider
│  └─ applicationId = draftId
│     │
│     └─ PersistDocumentStepProvider
│        └─ onPersist = persistDocumentStep callback
│           │
│           └─ WizardStep
│              └─ DynamicSection
│                 └─ FieldGrid
│                    └─ DynamicField
│                       └─ FileUploadField ← Uses all 3 contexts
│                          ├─ useApplicationId() → draftId
│                          ├─ useSyncFormToWizard() → sync function
│                          └─ usePersistDocumentStep() → persist function
```

---

## Data Flow: File Upload to PATCH Body

```
Step 1: FILE UPLOAD
────────────────────────────────────────────────────
User selects: document.pdf (2.5 MB)
                ↓
Storage API returns:
{
  id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  fileName: "document.pdf",
  contentType: "application/pdf",
  status: "AVAILABLE",
  uploadedAt: "2026-09-30T11:15:00.123456Z",
  meta: {
    folderId: "folder-123",
    sizeBytes: 2621440,
    checksum: "abc123def456...",
    ownerId: "user-789"
  }
}


Step 2: FORM DATA UPDATE
────────────────────────────────────────────────────
React Hook Form state (after publish):
{
  business_profile: { ... },
  owner_profile: [...],
  ...
  document: {
    document_details: {
      business_pan_card: [
        {
          id: "f47ac10b...",
          fileName: "document.pdf",
          contentType: "application/pdf",
          status: "AVAILABLE",
          uploadedAt: "2026-09-30T11:15:00.123456Z",
          meta: {...}
        }
      ]
    }
  }
}


Step 3: EXTRACT FILES
────────────────────────────────────────────────────
collectDocumentFiles() extracts:
[
  {
    id: "f47ac10b...",
    fileName: "document.pdf",
    contentType: "application/pdf",
    status: "AVAILABLE",
    uploadedAt: "2026-09-30",        ← Date only
    type: "BUSINESS_PAN",            ← Added from field.documentType
    meta: { ... }
  }
]


Step 4: BUILD APPLICATION PROPERTY
────────────────────────────────────────────────────
formDataToApplicationProperties() creates:
[
  {
    type: "DocumentProperty",
    name: "documents",
    access: {},
    value: [
      {
        id: "f47ac10b...",
        fileName: "document.pdf",
        contentType: "application/pdf",
        status: "AVAILABLE",
        uploadedAt: "2026-09-30",
        type: "BUSINESS_PAN",
        meta: { ... }
      }
    ]
  }
]


Step 5: PATCH API CALL
────────────────────────────────────────────────────
PATCH /api/applications/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: leads-services.local
Authorization: Bearer eyJhbGc...
Content-Type: application/json

[
  {
    "type": "DocumentProperty",
    "name": "documents",
    "access": {},
    "value": [
      {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "fileName": "document.pdf",
        "contentType": "application/pdf",
        "status": "AVAILABLE",
        "uploadedAt": "2026-09-30",
        "type": "BUSINESS_PAN",
        "meta": {
          "folderId": "folder-123",
          "sizeBytes": 2621440,
          "checksum": "abc123def456...",
          "ownerId": "user-789"
        }
      }
    ]
  }
]

                ↓

HTTP/1.1 200 OK
```

---

## Console Log Flow (During File Upload)

```
TIME    LOG MESSAGE                              COMPONENT
──────────────────────────────────────────────────────────────────
T+0ms   [FileUploadField] Starting upload...      FileUploadField.onDrop()
        Upload in progress...
T+500ms [FileUploadField] ✓ Upload succeeded     FileUploadField.then()
        [FileUploadField] ✓ Calling publish()    FileUploadField.then()
        [FileUploadField] publish() - stored...  FileUploadField.publish()
        [FileUploadField] ✓ About to call...     FileUploadField.publish()
T+501ms [FileUploadField] ✓✓✓ notifyWizard      FileUploadField.notifyWizard()
        [FileUploadField]   syncFormToWizard     (context check)
        [FileUploadField]   persistDocumentStep  (context check)
        [FileUploadField]   applicationId        (context check)
T+502ms (queueMicrotask scheduled)
        [FileUploadField] ✓ calling persist...   FileUploadField (microtask)
        [PersistDocumentStepProvider] persist    PersistDocumentStepProvider
T+503ms [persistDocumentStep] Called!            FormWizard.persistDocumentStep()
        [persistDocumentStep] stepDataRef...     (checking state)
        [persistDocumentStep] template:          (checking template)
        [persistDocumentStep] stepData for...    (checking form data)
        [persistDocumentStep] ✓ Calling save...  (proceeding)
T+505ms (PATCH request sent to backend)
        Network: PATCH /api/applications/{id} 200 OK
T+600ms [persistDocumentStep] ✓ saveDraft...    FormWizard.persistDocumentStep()
        queryClient.invalidateQueries()
        toast.success()
```

---

## Context Providers & Hooks

```
PROVIDER                           HOOK                    VALUE TYPE
────────────────────────────────────────────────────────────────────
ApplicationIdProvider              useApplicationId()      string | null
                                                           └─ application UUID

SyncFormToWizardProvider           useSyncFormToWizard()   (() => void) | null
                                                           └─ Sync form → store

PersistDocumentStepProvider        usePersistDocumentStep  (() => void) | null
                                                           └─ Persist callback

All provided by FormWizard:
├─ ApplicationIdProvider provides draftId
├─ PersistDocumentStepProvider provides persistDocumentStep callback
└─ SyncFormToWizardProvider provides syncFormToWizard callback
   (inside WizardStep → RepeatableInstance → DynamicSection)
```

---

## State Management

```
STORE                        LOCATION                UPDATED BY
──────────────────────────────────────────────────────────────────
useWizardStore               Zustand store           syncFormToWizard()
├─ formData: FormData        (persisted)             └─ Updates wizard state
├─ currentStep
├─ stepStatuses
└─ ...

React Hook Form              FormProvider            FileUploadField.onChange()
├─ watch()                   (in memory)             └─ Sets field value
├─ getValues()
└─ ...

Backend Application          API                     persistDocumentStep()
├─ properties[]              PATCH /api/...          └─ Updates via PATCH
└─ ...
```

---

## Error Handling Paths

```
FILE UPLOAD FAILS
    ↓
.catch() in FileUploadField
    ├─ Is it AbortError? → Silent (user cancelled)
    └─ Is it other error? → Display error, mark item as "error"
                            Toast: parseApiError(error).message

SYNC TO WIZARD FAILS
    ↓
Not handled (just updates state, can't really fail)

PERSIST DOCUMENT FAILS
    ↓
.catch() in FormWizard
    ├─ Get error via parseApiError()
    └─ Toast: error.message
       (user sees error message)

PATCH API FAILS
    ↓
.catch() in application.service
    ├─ Is it validation error? → Return errors
    └─ Is it server error? → Return parseApiError()
       FormWizard catches and displays toast
```

---

## Timing & Async Flow

```
TIMELINE                EVENT                                   BLOCKING
──────────────────────────────────────────────────────────────────────
T+0     User drops file                                         UI blocking
T+0     onDrop() called                                         Non-blocking
T+0     fileStorageService.upload() starts (async)             Returns promise
T+1     File upload in progress (network request)              Backend processing
T+500   Upload completes                                        Returns StoredFileReference
T+500   .then() callback executes                              Updates state
T+500   publish() calls                                        Updates form
T+500   notifyWizard() calls                                  Updates store
T+501   queueMicrotask scheduled                              Delayed to next microtask
T+502   persistDocumentStep() called (microtask)              Non-blocking
T+502   saveDraft() called                                    Returns promise
T+503   applicationService.saveDraft() starts (async)         Network request
T+504   apiClient.patch() sends request                       Network request
T+600   PATCH response received                               Backend response
T+600   .then() callback executes                             Updates UI
T+600   queryClient.invalidateQueries()                       Triggers refetch
T+600   toast.success()                                       Shows notification
```

---

## Key Decision Points

```
┌─ User uploads file
│
├─ FileUploadField.publish() called?
│  ├─ YES: Continue
│  └─ NO: Upload may have failed → Check Network tab
│
├─ notifyWizard() has correct contexts?
│  ├─ syncFormToWizard=true? YES: Form synced
│  ├─ persistDocumentStep=true? YES: Persist available
│  └─ NO: Providers not wrapping component
│
├─ persistDocumentStep() executed?
│  ├─ YES: Check next step
│  └─ NO: Context was null → Check console
│
├─ Current template is DocumentProperty?
│  ├─ YES: Continue
│  └─ NO: Template type is wrong in JSON
│
├─ Step data exists?
│  ├─ YES: Continue
│  └─ NO: Form data not synced → Check syncFormToWizard
│
├─ saveDraft() succeeded?
│  ├─ YES: ✅ SUCCESS! PATCH API was called
│  └─ NO: API error → Check Network tab for response
```

---

## Success Criteria

✅ All of the following should be true:

1. File upload succeeds (POST /api/files → 200)
2. StoredFileReference is returned
3. Form field is updated with file reference
4. notifyWizard() is called
5. persistDocumentStep() is called
6. PATCH /api/applications/{id} request is sent
7. PATCH request succeeds (200 OK)
8. File is now associated with application

If any step fails, check the troubleshooting guide in TEST_DOCUMENT_UPLOAD.md
