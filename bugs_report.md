This is a markdown that contains a list of bugs found in the project. Each bug is described with its context, the file where it was found, and a brief description of the issue.



# Review Report

## 🐛 Issues Found

### 1. Artwork Page Redirects to Invalid URL When No Artwork Exists

**Description:**  
When a user tries to access to the bloc that contain artwork, the application redirects to an invalid URL and returns a `404 Not Found` error.

**Current behavior:**
- The URL is always generated as:https://localhost:8443/artwork/w_-4_3

- The page responds with a `404 Not Found` error.



---

### 2. Search Functionality Issues

**Description:**  
The search functionality is currently not working as expected.

**Issues:**
- Searching by tags does not return results.
- Pressing `Enter` after typing a search query does not trigger the search action.

**Suggested improvement:**
- Add tag-based search support.
- Ensure the search form handles the `Enter` key event correctly.


---

### 3. Comment Validation Error

**Description:**  
When submitting a comment containing fewer than 3 characters, the backend returns a `400 Bad Request` due to DTO validation.

**Expected behavior:**
- Display a user-friendly validation message before sending the request.
- Prevent invalid submissions from reaching the backend.


---

### 4. User Search Appears in Tag Suggestions

**Description:**  
After performing a user search, the searched user appears in the tag suggestion list.

**Expected behavior:**
- User search results and tag suggestions should remain separated.
- Only relevant tags should appear in the tag suggestion system.


---

### 5. Remove File Verification When Updating Artwork




---


### 6. Cannot Follow Users Without Artwork

**Description:**  
Users cannot follow another user if that user does not have any uploaded artwork.



---

### 7. Online Status Not Updated After Accepting Friend Request (Resolved)

**Description:**  
The online status does not update automatically after a friend request is accepted.

**Resolution:**
- Implemented a WebSocket event to notify the user of the status change.

**To implement:**
- Ensure that the online status is updated in real-time for all friends when a user accepts a friend request.
- in frontend connect to the websocket and listen for the event that indicates a change in online status.



### 8. Online Status Notification Implementation
### 9. Friend system
The friend system is not implemented(accept and refuse). the chat trigger event is not wellknown
