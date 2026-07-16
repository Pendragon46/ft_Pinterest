# API Documentation

## Base URL

```
http://localhost:3000
```
# Users

get all users
```http
GET /users
```
get user by id
```http
GET /users/:id

```
get user by username
```http
GET /users/username/:username
```
Post a new user
```http
POST /users
```
Update user by id
```http
PATCH /users/:id
```
Delete user by id
```http
DELETE /users/:id
```
Get all artworks by user id
```http
GET /users/:id/artworks
```
Get all liked artworks by user id
```http
GET /users/:id/artowrks/liked
```

update role admin action
```http
PATCH /users/:id/roles
```

### Request Body

```json
{
  "username": "john", //unique
  "fullname": "John Doe",//optional
  "bio": "Software developer", //optional
  "email": "john@example.com",//unique
  "password": "password123"
  //to add avatar use form-data with key avatar and value file
  'avatar': file
}
```
---

# Artworks

Post a new artwork
```http
Post /artworks
```
Get all artworks
```http
Get /artworks/:id
```
Update artwork by id
```http
Patch /artworks/:id
```

Get feed of artworks, followed by user with id :userId
```http
GET /artworks/feed/:userId
```
Delete artwork by id
```http
delete /artworks/:id
```

delete all artworks by user id
```http
delete /artworks/deleteall/:userId
```
get all likes for an artwork
```http
GET /artworks/:id/likes
```

### Request Body

Form-data :

| Field | Type | Required | Description |
|---|---|---|---|
| title | string | ✅ | Titre de l'œuvre |
| description | string | ❌ | Description |
| image | art | ✅ | Image |
| tags | string[] | ❌ | Tags associés |

Example:

```
title: My artwork
description: Digital painting
tags: ["portrait","digital"]
image: artwork.png
```

### Response

```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "imageUrl": "string",
  "tags": ["string"],
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z",
  "userId": "string"
}
```

# likes

like an artwork
```http
POST /artworks/:artworkId/like
```
unlike an artwork
```http
DELETE /artworks/:artworkId/like
```

### Response

```json
{
	id: "string", 
	artworkId: "string",
	authorId: "string",
	createdAt: "2023-01-01T00:00:00.000Z"
}
```
# Comments

post a new comment for an artwork
```http
POST /artworks/:artworkId/comments
```
delete a comment for an artwork
```http
DELETE /artworks/:artworkId/comments/:commentId
```

###
getall comments for an artwork
```http
GET /artworks/:artworkId/comments
```
### Response

```json
[
  {
	"id": "string",
	"content": "string",
	"createdAt": "2023-01-01T00:00:00.000Z",
	"updatedAt": "2023-01-01T00:00:00.000Z",
	"authorId": "string",
	"artworkId": "string"
  }
]
```
# following

follow a user
```http
POST /users/:userId/follow/
```

unfollow a user
```http
DELETE /users/:userId/unfollow/
```
get all followers for a user
```http
GET /users/:userId/followers/
```
get all following for a user
```http
GET /users/:userId/following/
```
get count of followers for a user
```http
GET /users/:userId/following/count
```
get count of following for a user
```http
GET /users/:userId/followers/count
```

### Response

```json
[
  {
	"id": "string",
	"followerId": "string",
	"followingId": "string",
	"createdAt": "2023-01-01T00:00:00.000Z"
  }
]
```
# Search
global search for artworks, users and tags
```http
GET /search?q=searchTerm&&page=n&&limit=n&&sort=recent|oldest
```
search for artworks in titlle and description and tags
```http
GET /search/artworks?tag=tagName&&page=n&&limit=n&&sort=recent|oldest
```
search for users  username and fullName
```http
GET /search/users?username=username&&page=n&&limit=n&&sort=recent|oldest
```
search for tags
```http
GET /search/tags?tag=tagName&&page=n&&limit=n&&sort=recent|oldest
```

### Request Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| q | string | ✅ | Search term |
| page | number | ❌ | Page number (default: 1) |
| limit | number | ❌ | Number of results per page (default: 10)
| sort | string | ❌ | Sort order (recent or oldest, default: recent) |


