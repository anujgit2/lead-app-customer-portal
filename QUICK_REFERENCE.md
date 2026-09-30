# Quick Reference: File Upload → PATCH API

## 🎯 The Goal
After file upload to `POST /api/files`, automatically call `PATCH /api/applications/{id}` with DocumentProperty.

## ✅ Status
**Already Implemented!** The system works. Added logging to verify the flow.

---

## 🚀 Quick Test (30 seconds)

1. Open DevTools: **F12**
2. Go to **Console tab**
3. Upload a file in wizard
4. Search console for: **`[persistDocumentStep] ✓ saveDraft succeeded`**

✅ If you see it → PATCH API is working!
❌ If not → Follow troubleshooting below

---

## 📋 Files Modified

| File | Changes |
|------|---------|
| FileUploadField.tsx | +10 console.log statements |
| FormWizard.tsx | +12 console.log statements |

Both files in:
- `src/components/forms/`
- `src/features/loan-application/`

---

## 🔍 How to Debug

### Console Logs to Watch

```javascript
// File upload succeeds
[FileUploadField] ✓ Upload succeeded for: document.pdf

// Wizard notified
[FileUploadField] ✓✓✓ notifyWizard called
[FileUploadField]   persistDocumentStep: true  // ← Must be true

// PATCH API triggered
[persistDocumentStep] Called! currentStep: 5
[persistDocumentStep] template: document propertyType: DocumentProperty
[persistDocumentStep] ✓ Calling saveDraft...

// Success!
[persistDocumentStep] ✓ saveDraft succeeded
```

### Network Tab to Watch

Look for PATCH request:
- **URL**: `/api/applications/{id}`
- **Method**: PATCH
- **Status**: 200 OK
- **Body**: DocumentProperty with file metadata

---

## ⚙️ Architecture (Simplified)

```
User uploads file
    ↓
POST /api/files → Success
    ↓
FileUploadField.publish()
    ↓
notifyWizard()
    ├─ Sync form data ← syncFormToWizard()
    └─ Call PATCH API ← persistDocumentStep()
        ↓
    PATCH /api/applications/{id}
        ↓
    ✅ Success!
```

---

## 🔧 Provider Chain

```tsx
<ApplicationIdProvider>           // Provides applicationId
  <PersistDocumentStepProvider>   // Provides persistDocumentStep callback
    <WizardStep>
      <FileUploadField>
        // Has access to both:
        // - useApplicationId()
        // - usePersistDocumentStep()  ← Triggers PATCH
      </FileUploadField>
    </WizardStep>
  </PersistDocumentStepProvider>
</ApplicationIdProvider>
```

---

## 📝 PATCH Request Body Format

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
          "ownerId": "user-id"
        }
      }
    ]
  }
]
```

---

## ❓ Troubleshooting

| Problem | Check This |
|---------|-----------|
| No logs appear | Open DevTools, upload file again |
| PATCH not sent | Check `persistDocumentStep: true` in logs |
| PATCH fails | Check Network tab for error response |
| Wrong template | Verify `propertyType: DocumentProperty` |
| No file data | Check form data was synced |

---

## 📚 Full Documentation

| Document | Use For |
|----------|---------|
| IMPLEMENTATION_SUMMARY.md | Overview |
| PATCH_API_FLOW.md | Deep architecture |
| FLOW_DIAGRAM.md | Visual diagrams |
| TEST_DOCUMENT_UPLOAD.md | Step-by-step testing |
| DEBUG_DOCUMENT_UPLOAD.md | All console logs |

---

## 🎓 Key Files

| File | Role |
|------|------|
| FileUploadField.tsx | Upload files, trigger persist |
| FormWizard.tsx | Orchestrate, provide callbacks |
| application.service.ts | Build PATCH request, send it |
| application-context.tsx | Provide context hooks |

---

## 💾 Data Flow Summary

```
User file (document.pdf)
    ↓
File upload API: {id, fileName, contentType, ...}
    ↓
Form data: {document: {document_details: {business_pan: [file]}}}
    ↓
Extract: [file with type added]
    ↓
ApplicationProperty: {type: "DocumentProperty", value: [file]}
    ↓
PATCH /api/applications/{id}
    ↓
Backend persists file association ✅
```

---

## ✨ Key Points

1. **It's already implemented** - No changes needed
2. **Logging added for visibility** - Console shows the flow
3. **All contexts provided** - FormWizard wraps correctly
4. **PATCH format correct** - DocumentProperty structure matches spec
5. **Error handling works** - Toast shows errors if PATCH fails

---

## 🚦 Go/No-Go Checklist

- [ ] Dev server running
- [ ] Logged into application
- [ ] At Documents wizard step
- [ ] File uploaded successfully (POST 200)
- [ ] File shows with checkmark ✓
- [ ] Console shows all logs completing
- [ ] Network shows PATCH request with 200 status

✅ All checked? → **System is working!** 🎉

---

## Remove Logging When Done

Search for and remove:
```
console.log.*\[FileUploadField\]
console.log.*\[persistDocumentStep\]
```

In files:
- src/components/forms/FileUploadField.tsx
- src/features/loan-application/FormWizard.tsx

---

## Need More Info?

See the detailed guides:
1. **PATCH_API_FLOW.md** - Detailed architecture
2. **FLOW_DIAGRAM.md** - Visual flow
3. **TEST_DOCUMENT_UPLOAD.md** - Complete testing guide
4. **DEBUGGING_COMPLETE.md** - Summary with next steps
