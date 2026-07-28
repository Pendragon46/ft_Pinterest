This is a markdown that contains a list of bugs found in the project. Each bug is described with its context, the file where it was found, and a brief description of the issue.



# Review Report

## 🐛 Issues Found

### . Artwork Page Redirects to Invalid URL When No Artwork Exists

**Description:**  
When a user tries to access to the bloc that contain artwork, the application redirects to an invalid URL and returns a `404 Not Found` error.

**Current behavior:**
- The URL is always generated as:https://localhost:8443/artwork/w_-4_3

- The page responds with a `404 Not Found` error.



---

### . Search Functionality Issues

**Description:**  
The search functionality is currently not working as expected.

**Issues:**
- Searching by tags does not return results.
- Pressing `Enter` after typing a search query does not trigger the search action.

**Suggested improvement:**
- Add tag-based search support.
- Ensure the search form handles the `Enter` key event correctly.


---

###  Comment Validation Error

**Description:**  
When submitting a comment containing fewer than 3 characters, the backend returns a `400 Bad Request` due to DTO validation.

**Expected behavior:**
- Display a user-friendly validation message before sending the request.
- Prevent invalid submissions from reaching the backend.


---

###  User Search Appears in Tag Suggestions

**Description:**  
After performing a user search, the searched user appears in the tag suggestion list.

**Expected behavior:**
- User search results and tag suggestions should remain separated.
- Only relevant tags should appear in the tag suggestion system.


---

###  Remove File Verification When Updating Artwork




---


###  Cannot Follow Users Without Artwork

**Description:**  
Users cannot follow another user if that user does not have any uploaded artwork.



---

###  Online Status Not Updated After Accepting Friend Request (Resolved)

**Description:**  
The online status does not update automatically after a friend request is accepted.

**Resolution:**
- Implemented a WebSocket event to notify the user of the status change.

**To implement:**
- Ensure that the online status is updated in real-time for all friends when a user accepts a friend request.
- in frontend connect to the websocket and listen for the event that indicates a change in online status.

---

###  Online Status Notification Implementation

---
###  Friend system
The friend system is not implemented(accept and refuse). the chat trigger event is not wellknown

---
### Artwork input
to create an artwork the title should be greater than 3 . but when we try to create an artwork with a title less than 3 characters no message is displayed to the user


### User
- Displayname validation:

in the prisma schema there is no Displayname should we add it to the user model ? there is a dto that check the string inputed in the displayname and if it exceed 50 characters it will return a 400 bad request in the console. Also we can just add space in the displayname field and it will be accepted. we should add a validation to check if the displayname is not empty and if it contains only spaces.

 - Username validation:
 Same as displayname validation.


###  login

When the user enter invalid credentials it will return a 400 bad request in the console. we should display a message to the user that the credentials are invalid.

#### dto validation

When we try to register username with less than 3 characters or more than 30 characters it will return a 400 bad request in the console

#### Invalid 

#### Throttler

Sometimes there is this message "react-dom_client.js?v=751d9f8d:2634 Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render." in the console when we try to login or register

### Comment
We can't access the user via the comment . i don't know if we should


### refocus
when we try to refocus the page a warning appears in the console "Blocked aria-hidden on an element because its descendant retained focus. The focus must not be hidden from assistive technology users. Avoid using aria-hidden on a focused element or its ancestor. Consider using the inert attribute instead, which will also prevent focus."


#### USer update
When modifying the user settings without saving the changes and logout . The sign in page displayed is still displayed after the user successfully sign in 

#### TITLE
if the title of the artwork exceed the UI size it's not responsive

### UI
- The exit and edit button is not displayed in profile /works	
- No artwork is diplayed in home page as the guest user 

### chat
- spam messages trigger exceptions in the console
- chat to non following users trigger 403 forbidden error
- chat responsiveness is not good in mobile view

### Converation
- the conversation is not deleted when the user delete account