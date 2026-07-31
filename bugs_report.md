This is a markdown that contains a list of bugs found in the project. Each bug is described with its context, the file where it was found, and a brief description of the issue.



# Review Report

## 🐛 Issues Found

### . Artwork Page Redirects to Invalid URL When No Artwork Exists

**Description:**  
When there is no user and artwork , when we search something and click on an artwork there is 404 exception in the console. we should not redirect user to https://localhost:8443/api/artworks/w_-4_-2 but just show empty case 


---

### . Search Functionality Issues
- we can't search for a artwork with the title , i don't know if it's a feature or not

---

### UI 

- there is no exit button, after editing the artwork

---

###  Comment

**Description:**  
- if the description of the artwork is too long we can't see the post comment button and the follow button


---
###  Cannot Follow Users Without Artwork

**Description:**  
Users cannot follow another user if that user does not have any uploaded artwork.


---


---
### Artwork input
to create an artwork the title should be greater than 3 . but when we try to create an artwork with a title less than 3 characters no message is displayed to the user


### User
- Displayname validation:

in the prisma schema there is no Displayname should we add it to the user model ? there is a dto that check the string inputed in the displayname and if it exceed 50 characters it will return a 400 bad request in the console. Also we can just add space in the displayname field and it will be accepted. we should add a validation to check if the displayname is not empty and if it contains only spaces.

 - Username validation:
 Same as displayname validation.

 - Bio validation:
 Same as displayname validation.



###  login

When the user enter invalid credentials it display unauthorized	

// expection

#### Throttler

Sometimes there is this message "react-dom_client.js?v=751d9f8d:2634 Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render." in the console when we try to login or register


- when log out a throttler message appears in the console

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

### Chat inaccessible
- we can't start a chat with a user 
- an internal server error is thrown in the console

### chat to check after the chat bug is resolved
- spam messages trigger exceptions in the console
- chat to non following users trigger 403 forbidden error
- chat responsiveness is not good in mobile view

### Converation
- the conversation is not deleted when the user delete account

----

### Admin Panel
- When trying to delete the unique admin user an exception is thrown in the console.
- after deleting my account as an admin user, a 401 unauthorized error is thrown in the console
- the video artwork is not displayed in the artwork panel
- Creating a new user with an existing username and mail throw a conflict excpection

### auth
- there is throttling issues when trying to delete the account that i just created .
- Some account don't display avatar sometimes with google auth


### register
- When trying to register with an existing username or email a conflict exception is thrown in the console


cloudinary est un cloud pour sauvegarder des images et des video . est un CDN (qui est un reseau de serveur mondial ) optimise les cache .  fait aussi de la modification d'image et video et de la transformation 

le Free plan contient 25 credits
1 credit =
- 1000 transformation d'image ou video
- 1 Gb de stockage
- 1 Gb de bande passante
- 1 Gb de bande passante video 

nous avons convenu qu'une image/videos pour avatar ou artwork ne devrait pas depasser les 10 mo . donc au total on a 2560 images/videos pour le free plan . donc si on depasse ce nombre on ne pourra plus sauvegarder des images/videos sur cloudinary et on aura une exception dans la console . vaut mieux creer un nouveau compte avant l'evaluation pour eviter les imprevu 