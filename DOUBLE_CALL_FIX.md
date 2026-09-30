# Fix: Double PATCH API Call

## Problem

The PATCH API was being called **twice** instead of once:

```
FileUploadField] ✓ Calling publish() via queueMicrotask (×2)
[persistDocumentStep] Called! (×2)
PATCH /api/applications/{id} (×2)
```

## Root Cause

React's **StrictMode** (in development) intentionally double-invokes state setter callbacks to help detect bugs. When we call `setTransientItems()` with a callback that schedules `publish()` via `queueMicrotask()`, both invocations execute:

```javascript
setTransientItems((prev) => {
  const nextItems = prev.map(...);
  
  // This runs TWICE in StrictMode
  queueMicrotask(() => {
    publish(nextItems);  // Called twice!
  });
  
  return nextItems;
});
```

## Solution

Add a deduplication mechanism using a `Set` to track which uploads have been published:

```javascript
// Track published uploads to prevent double-calls in StrictMode
const publishedItemsRef = useRef<Set<string>>(new Set());

// After upload succeeds:
const publishKey = `${item.id}-${storageFile.id}`;
if (!publishedItemsRef.current.has(publishKey)) {
  publishedItemsRef.current.add(publishKey);
  
  queueMicrotask(() => {
    publish(current);  // Only called once per unique upload
  });
}
```

## Changes Made

**File:** `src/components/forms/FileUploadField.tsx`

1. **Line 61**: Added `publishedItemsRef` to track which uploads have been published
2. **Line 78**: Update `transientItemsRef` in effect hook
3. **Lines 176-189**: Added deduplication logic using `publishKey`

## How It Works

1. Each upload gets a unique key: `${itemId}-${fileId}`
2. Before publishing, check if this key is in the `publishedItemsRef` Set
3. If not found, add it and schedule publish
4. If StrictMode calls the setter again, the key is already in the Set, so publish is skipped
5. This prevents duplicate PATCH API calls

## Testing

1. **Hard refresh**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
2. **Upload a file**
3. **Check console**: You should see `[FileUploadField] ✓ Publishing after upload success` **only once**
4. **Check Network**: PATCH request should appear **only once** with status 200

✅ If you see only one PATCH request → **Fixed!**

## Note on StrictMode

This fix is specifically for **development mode**. In production (where StrictMode is disabled), the double-invocation never happens. However, this deduplication is safe for both environments:

- **Development**: Prevents double-calls from StrictMode
- **Production**: Still works correctly (Set never gets duplicate keys)

No production code is affected by this change.
