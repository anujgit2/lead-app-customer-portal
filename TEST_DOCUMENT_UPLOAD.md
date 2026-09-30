# Testing Document Upload & PATCH API

## Quick Test Checklist

### Prerequisites
- [ ] Dev server running: `npm run dev`
- [ ] Browser DevTools open (F12)
- [ ] Console tab active
- [ ] Network tab open and recording

### Step 1: Navigate to Document Upload Step
- [ ] Go to `/loan-application/new` (start new application)
- [ ] Click "Next" to navigate through wizard steps
- [ ] Stop at the "Documents" step (should be the last step before Review)

### Step 2: Upload a File
- [ ] Click drag-drop area or browse
- [ ] Select a PDF, JPEG, or PNG file (under 5MB)
- [ ] Watch the file upload progress

### Step 3: Check Console Logs

**Expected log sequence:**

```
[FileUploadField] Starting upload for: {filename} applicationId: {uuid}
```
↓ (file is being uploaded)
```
[FileUploadField] ✓ Upload succeeded for: {filename}
```
↓ (file uploaded successfully)
```
[FileUploadField] ✓ Calling publish() after upload success
[FileUploadField] publish() - stored files: 0 new files: 1
[FileUploadField] ✓ About to call notifyWizard()
[FileUploadField] ✓✓✓ notifyWizard called
[FileUploadField]   syncFormToWizard: true
[FileUploadField]   persistDocumentStep: true
[FileUploadField]   applicationId: {uuid}
[FileUploadField] ✓ calling persistDocumentStep in microtask
```
↓ (context callback triggered)
```
[PersistDocumentStepProvider] persist called
[persistDocumentStep] Called! currentStep: 5 templates length: 6
[persistDocumentStep] stepDataRef.current keys: business_profile,owner_profile,...,document
[persistDocumentStep] template: document propertyType: DocumentProperty full template: {object}
[persistDocumentStep] stepData for template document : {object}
[persistDocumentStep] ✓ Calling saveDraft with template: document applicationId: {uuid}
```
↓ (API call in progress)
```
[persistDocumentStep] ✓ saveDraft succeeded
```

✅ **Success!** If you see all these logs, the PATCH API was called.

### Step 4: Check Network Tab

Look for a request matching:
- **Method**: PATCH
- **URL**: `/api/applications/{applicationId}`
- **Status**: 200 (or 201, 204, depending on API)

**Request Headers should include:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body should contain:**
```json
[
  {
    "type": "DocumentProperty",
    "name": "documents",
    "access": {},
    "value": [
      {
        "id": "file-uuid",
        "fileName": "example.pdf",
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

---

## Troubleshooting

### ❌ Problem: No console logs appear

**Cause**: Code not being executed or file is not in right component

**Check**:
1. Open DevTools Console
2. Try uploading again
3. Verify you're on the Documents wizard step
4. Check if file is being uploaded to `http://leads-services.local/api/files`

**Fix**:
- Restart dev server: `npm run dev`
- Hard refresh browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

---

### ❌ Problem: Logs stop at `[FileUploadField] ✓ calling persistDocumentStep in microtask`

**Cause**: `persistDocumentStep` callback is not available (context issue)

**Check in console:**
```javascript
// Check if the context is available
// Open console and type:
JSON.stringify({
  appId: document.body.innerHTML.includes("document"),
  hasLogs: document.body.innerHTML.includes("[persistDocumentStep]")
})
```

**Fix**:
- Verify FormWizard.tsx line 336: `<PersistDocumentStepProvider onPersist={persistDocumentStep}>`
- Verify WizardStep is inside the PersistDocumentStepProvider
- Check browser console for any React errors (red text)

---

### ❌ Problem: `[persistDocumentStep] Early return: template missing at currentStep X`

**Cause**: Current step doesn't have a template or template index is wrong

**Check**:
- What step number is showing? (e.g., currentStep: 5)
- How many templates exist? (e.g., templates length: 6)
- Is there a template at that index?

**Fix**:
- Verify application-template.json has a "document" or "documents" template
- Check that it's properly configured with `"type": "DocumentProperty"`

---

### ❌ Problem: `[persistDocumentStep] Early return: propertyType is ... not DocumentProperty`

**Cause**: Template's propertyType is not exactly "DocumentProperty"

**Check**:
- What is the propertyType? (should be "DocumentProperty")
- Check application-template.json at that template

**Fix**:
- Verify in JSON: `"type": "DocumentProperty"` (case-sensitive)
- Make sure it's at `formTemplates[X].template.type`
- Restart dev server after JSON changes

---

### ❌ Problem: `[persistDocumentStep] Early return: stepData is undefined`

**Cause**: Form data was not synced to the wizard or is empty

**Check**:
- Did you actually upload a file?
- Is the form showing the uploaded file with a checkmark?

**Fix**:
- Try uploading again
- Make sure file is < max size (check upload field config)
- Check Network tab to see if file upload succeeded (POST /api/files → 200 OK)

---

### ❌ Problem: `[persistDocumentStep] ✗ saveDraft error: {error}`

**Cause**: PATCH API call failed

**Check**:
- What is the error message?
- Check Network tab for PATCH request status and response

**Common errors**:
- `401 Unauthorized` → User session expired, re-login
- `400 Bad Request` → Invalid request format
- `500 Internal Server Error` → Backend issue

**Fix**:
- Check Network tab PATCH response for details
- Verify API is running at `http://leads-services.local`
- Check backend logs for error details

---

## Manual API Test (Using curl)

If console logs don't help, test the API directly:

```bash
# Get an application ID first
APP_ID="your-application-uuid"
FILE_ID="the-file-uuid-from-upload"

# Send PATCH request manually
curl -X PATCH http://leads-services.local/api/applications/$APP_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $YOUR_TOKEN" \
  -d '[
    {
      "type": "DocumentProperty",
      "name": "documents",
      "access": {},
      "value": [
        {
          "id": "'$FILE_ID'",
          "fileName": "test.pdf",
          "contentType": "application/pdf",
          "status": "AVAILABLE",
          "uploadedAt": "2026-09-30",
          "type": "BUSINESS_PAN",
          "meta": {
            "folderId": null,
            "sizeBytes": 1234,
            "checksum": "abc123",
            "ownerId": "user-id"
          }
        }
      ]
    }
  ]'
```

---

## Success Indicators

✅ You should see:
1. Green checkmark on uploaded file in UI
2. All console logs completing without errors
3. PATCH request in Network tab with 200/201/204 status
4. No red errors in browser console
5. Application can be saved/submitted normally

---

## Questions or Issues?

Check the `PATCH_API_FLOW.md` for detailed architecture info.
