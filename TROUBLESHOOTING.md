# Troubleshooting Guide - GCP Storage Upload

## Understanding the File Path Structure

When you upload a file, the system generates a path like this:
```
{belongsTo}/{refId}/{timestamp}-{fileName}
```

### Example Breakdown:
- **Path:** `user/507f1f77bcf86cd799439011/1768213123256-profile-picture.jpg`
- **`belongsTo`** = `"user"` (or `"company"`) - The entity type
- **`refId`** = `"507f1f77bcf86cd799439011"` - The ID of the user/company (MongoDB ObjectId)
- **`timestamp`** = `1768213123256` - When the upload was initiated
- **`fileName`** = `"profile-picture.jpg"` - The original file name

## Common Errors

### 1. `NoSuchKey` Error
**Error Message:**
```
<Code>NoSuchKey</Code>
<Message>The specified key does not exist.</Message>
```

**Cause:** The file was never actually uploaded to GCP Storage.

**Why this happens:**
1. The API generates a signed upload URL
2. The client must upload the file to that URL
3. If the SDK isn't installed, the URL is invalid
4. The upload fails silently
5. The file never appears in the bucket

**Solution:**
1. Install the Google Cloud Storage SDK:
   ```bash
   yarn add @google-cloud/storage
   ```

2. Set up authentication (choose one):
   - **Service Account Key:** Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable
   - **Application Default Credentials:** Run `gcloud auth application-default login`

3. Restart your server

4. Make sure your client code actually uploads the file to the signed URL

### 2. `AccessDenied` Error
**Error Message:**
```
<Code>AccessDenied</Code>
<Message>Access denied.</Message>
```

**Cause:** Trying to access a private object without a signed URL.

**Solution:** Use the `/assets/:id/download-url` endpoint to get a signed download URL.

## Checking if Asset Record Exists

Even if the file doesn't exist in GCP Storage, the database record might exist. Check using:

```bash
# Get asset by ID
curl -X GET http://localhost:3000/assets/6961ede54ab517fa1c97fc39

# Get all assets for a user
curl -X GET http://localhost:3000/assets/ref/507f1f77bcf86cd799439011
```

## Upload Flow

The correct upload flow is:

1. **Step 1:** Call the API to get a signed upload URL
   ```bash
   POST /assets/upload-single
   {
     "fileName": "profile-picture.jpg",
     "fileSize": 1024000,
     "mimeType": "image/jpeg",
     "refId": "507f1f77bcf86cd799439011",
     "belongsTo": "user"
   }
   ```

2. **Step 2:** Use the returned `uploadUrl` to upload the file directly to GCP Storage
   ```javascript
   // Example client-side code
   const file = document.getElementById('fileInput').files[0];
   const response = await fetch(uploadUrl, {
     method: 'PUT',
     body: file,
     headers: {
       'Content-Type': file.type
     }
   });
   ```

3. **Step 3:** The file should now appear in GCP Storage

## What is `refId`?

`refId` is the **Reference ID** - it's the ID of the entity that "owns" this file:
- If `belongsTo: "user"`, then `refId` should be a user ID (MongoDB ObjectId)
- If `belongsTo: "company"`, then `refId` should be a company ID

This allows you to organize files by user or company in your storage bucket.

## Verification Steps

1. **Check if asset record exists in database:**
   ```bash
   curl http://localhost:3000/assets/6961ede54ab517fa1c97fc39
   ```

2. **Check if file exists in GCP Storage:**
   - Go to GCP Console → Storage → Buckets → `mgm_dev`
   - Navigate to: `user/507f1f77bcf86cd799439011/`
   - Look for: `1768213123256-profile-picture.jpg`

3. **If record exists but file doesn't:**
   - The upload failed
   - Delete the database record
   - Try uploading again with proper SDK setup

4. **If neither exists:**
   - The upload process never completed
   - Check server logs for errors
   - Verify SDK is installed and credentials are set
