# Fix Applied: File Upload → publish() Flow

## Problem

File upload was succeeding but `publish()` was not being called, so `notifyWizard()` and `persistDocumentStep()` were never triggered.

**Console showed:**
```
[FileUploadField] Starting upload for: document.pdf applicationId: 7cc6545e...
[FileUploadField] ✓ Upload succeeded for: document.pdf
```

But then nothing else happened.

## Root Cause

The `nextItems` variable was being set inside the `setTransientItems` state updater closure, but it was immediately read OUTSIDE that closure. Since React state updates are asynchronous, `nextItems` would always be `null` when checked after `setTransientItems()` returns.

**Before:**
```javascript
let nextItems: FileItem[] | null = null;
setTransientItems((prev) => {
  nextItems = prev.map(...);  // ← Set inside closure
  return nextItems;
});
if (nextItems) {  // ← Read outside closure - ALWAYS null!
  publish(nextItems);
}
```

## Solution

Move the `publish()` call INSIDE the state updater closure using `queueMicrotask()`:

**After:**
```javascript
setTransientItems((prev) => {
  const nextItems = prev.map(...);
  
  // Schedule publish immediately after state update
  queueMicrotask(() => {
    publish(nextItems);  // ← Called with correct data
  });
  
  return nextItems;
});
```

## Changes Made

**File:** `src/components/forms/FileUploadField.tsx` (lines 144-178)

1. Moved `nextItems` declaration INSIDE the map callback
2. Added `queueMicrotask()` to schedule `publish()` call
3. Enhanced logging to track state updates and publish calls

## Expected Behavior After Fix

Now when you upload a file, you should see:

```
[FileUploadField] Starting upload for: document.pdf applicationId: 7cc6545e...
[FileUploadField] ✓ Upload succeeded for: document.pdf storageFile.id: f47ac10b...
[FileUploadField] Created storedFile with type: BUSINESS_PAN
[FileUploadField] In setTransientItems, prev.length: 1 looking for itemId: abc-def-123
[FileUploadField] Found item?: true
[FileUploadField] Updated nextItems with status:success, publishing immediately
[FileUploadField] ✓ Calling publish() via queueMicrotask
[FileUploadField] publish() - stored files: 0 new files: 1
[FileUploadField] ✓ About to call notifyWizard()
[FileUploadField] ✓✓✓ notifyWizard called
[FileUploadField]   syncFormToWizard: true
[FileUploadField]   persistDocumentStep: true
[FileUploadField]   applicationId: 7cc6545e...
[FileUploadField] ✓ calling persistDocumentStep in microtask
[PersistDocumentStepProvider] persist called
[persistDocumentStep] Called! currentStep: 5 templates length: 6
[persistDocumentStep] template: document propertyType: DocumentProperty
[persistDocumentStep] ✓ Calling saveDraft with template: document applicationId: 7cc6545e...
[persistDocumentStep] ✓ saveDraft succeeded
```

And in the Network tab, you should see:
```
PATCH /api/applications/7cc6545e-e7eb-4ee7-a3a9-7053ba8adaa2
Status: 200 OK
```

## Test Now

1. Hard refresh your browser: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows/Linux)
2. Upload a file in the Documents wizard step
3. Watch the console - you should now see ALL the logs
4. Check Network tab for PATCH request

✅ If you see `[persistDocumentStep] ✓ saveDraft succeeded` → **It's working!**

## Why queueMicrotask()?

`queueMicrotask()` ensures that:
1. React state updater completes first
2. Component is re-rendered with new state
3. THEN `publish()` is called with correct data
4. All contexts are available and up-to-date

This is the proper way to trigger side effects after state updates.
