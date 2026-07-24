import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';
import { Role } from '@prisma/client';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class UsersService {
	constructor(private readonly prisma: PrismaService,
				private readonly cloudinaryService: CloudinaryService,
				private readonly mailService: MailService,
	){}

  async create(data: Prisma.UserCreateInput, file?: Express.Multer.File) {
	let uploadResult: UploadApiResponse | undefined;
	let user = await this.prisma.user.findUnique({where: {username: data.username}})
    if (user) {
      throw new ConflictException('Username already taken');

    }
	user = await this.prisma.user.findUnique({where: {email: data.email}})
	if (user) {
	  throw new ConflictException('Email already exist');
	}
	try{
		if (file) {
		uploadResult = await this.cloudinaryService.uploadImage(file);
		data.avatarUrl = uploadResult.secure_url;
		data.avatarPublicId = uploadResult.public_id;
	}
	return await this.prisma.user.create({
		data: data,})
	}
	catch (error){
			if (uploadResult && uploadResult?.public_id)
				await this.cloudinaryService.deleteImage(uploadResult.public_id);
			throw error;
		}	
	}

  async findAll() {
	// Une liste vide est une réponse valide, pas un 404 : le dashboard admin
	// doit pouvoir afficher un état vide. Le `select` évite de divulguer le
	// hash des mots de passe (findMany sans select les renverrait tous).
	return this.prisma.user.findMany({
		orderBy: { createdAt: 'desc' },
		select: {
			id: true, fullname: true, username: true, email: true,
			avatarUrl: true, role: true, createdAt: true, updatedAt: true,
			_count: { select: { artworks: true, comments: true } },
		},
	});
  }

  async findOneByUsername(username: string) {
    let user =  await this.prisma.user.findMany({
		where:{
			username:{
				contains: username,
				mode: 'insensitive',
			}
		},
		orderBy: {
			username: 'asc',
		}
	})
	if (!user) {
	  throw new NotFoundException('User not found');
	}
	return user;
  }

//   async getUserProfile(userId: string) {
// 	const user = await this.prisma.user.findUnique({
// 		where: {
// 			id: userId,
// 		},
// 		include: {
// 			artworks: true,
// 			_count: {
// 				select: {
// 					artworks: true,
// 					followers: true,
// 					following: true,
// 					role: true,
// 				},
// 			},
// 		},
// 	});
// 	if (!user) {
// 		throw new NotFoundException('User not found');
// 	}
// 	return user;
//   }

  async findOneById(id: string) {
	let user =  await this.prisma.user.findUnique({
		where: {
			id
		}
	})
	if (!user) {
	  throw new NotFoundException('User not found');
	}
	return user;
  }

  // get user connected and check if he can update or delete the user
  async update(id: string, data: Prisma.UserUpdateInput, file?: Express.Multer.File, loggedUserId?: string) {
	const target = await this.prisma.user.findUnique({where: {id}})
	if (!target) {
	  throw new NotFoundException('User not found');
	}
	// D2 — l'autorisation dépend du rôle de L'APPELANT, pas de la cible.
	// Tester target.role laissait n'importe qui éditer un ADMIN.
	const actor = await this.prisma.user.findUnique({
		where: { id: loggedUserId },
		select: { id: true, role: true },
	});
	if (!actor) throw new ForbiddenException('Unknown actor');
	if (id !== actor.id && actor.role !== Role.ADMIN) {
		throw new ForbiddenException('You are not authorized to update this user');
	}
	const user = target;
	if (data.username) {
		const existingUser = await this.prisma.user.findUnique({where: {username : data.username as string}})
		if (existingUser && existingUser.id !== id) {
		  throw new ConflictException('Username already taken');
		}
	}
	if (data.email) {
		const existingUser = await this.prisma.user.findUnique({where: {email : data.email as string}})
		if (existingUser && existingUser.id !== id) {
		  throw new ConflictException('Email already taken');
		}
	}
	if (file) {
		let OldImagePublicId = user.avatarPublicId;
		let uploadResult: UploadApiResponse | undefined;

		try {
			uploadResult= await this.cloudinaryService.uploadImage(file);
			const updatedUser = await this.prisma.user.update({
				where: { id },
				data: {
					...data,
					avatarUrl: uploadResult.secure_url,
					avatarPublicId: uploadResult.public_id,
				}
			});
			if (OldImagePublicId && OldImagePublicId !== process.env.DEFAULT_AVATAR_PUBLIC_ID) {
				try {
				await this.cloudinaryService.deleteImage(OldImagePublicId);
				} catch (error) {
					console.error('Error deleting old avatar', error);
					throw error;
				}
			}
			return updatedUser;
		}
		catch (error){
			if (uploadResult?.public_id)
				await this.cloudinaryService.deleteImage(uploadResult.public_id);
			throw error;
		}
	}
	return await this.prisma.user.update({
		where: { id },
		data,
	})
}

async getUserArtworks (userId: string) {
	const user = await this.prisma.user.findUnique({
		where: { id: userId },
		include: {
			artworks: { 
				include: {
					_count: {
						select: {
						likes: true,
						comments: true,
					},
				},
			},
		},
	}});
	if (!user) {
	  throw new NotFoundException('User not found');
	}
	return user.artworks;
}

async getUserLikedArtworks(userId: string) {
	const user = await this.prisma.user.findUnique({
		where: { id: userId },
	});
	if (!user) {
	  throw new NotFoundException('User not found');
	}
	const likedArtworks = await this.prisma.like.findMany({
		where: { authorId: userId },
		include: {
			artwork: {
				include: {
					_count: {
						select: {
						likes: true,
						comments: true,
					},
				},
			},
		},
	}});
	return likedArtworks.map(like => like.artwork);
}
							

  // Export RGPD : toutes les données personnelles dans un seul document.
  // `password` et `avatarPublicId` sont exclus — secret / identifiant d'infra.
  async exportUserData(userId: string) {
	const user = await this.prisma.user.findUnique({
	  where: { id: userId },
	  select: {
		id: true, fullname: true, username: true, email: true, bio: true,
		avatarUrl: true, role: true, createdAt: true, updatedAt: true,
		artworks: {
		  select: {
			id: true, title: true, description: true, mediaUrl: true,
			createdAt: true, updatedAt: true,
			tags: { select: { name: true } },
		  },
		},
		comments: { select: { id: true, content: true, artworkId: true, createdAt: true } },
		likes: { select: { artworkId: true, createdAt: true } },
		followers: { select: { followingId: true, createdAt: true } },
		following: { select: { followerId: true, createdAt: true } },
	  },
	});
	if (!user) throw new NotFoundException('User not found');

	// Notifier par e-mail (best-effort, ne bloque jamais l'export).
	await this.mailService.sendDataExportReady(user.email, user.username);

	return {
	  exportedAt: new Date().toISOString(),
	  format: 'atlaas-gdpr-export-v1',
	  notice:
		'This file contains all personal data held about you. ' +
		'Passwords are never included.',
	  account: {
		id: user.id, fullname: user.fullname, username: user.username,
		email: user.email, bio: user.bio, avatarUrl: user.avatarUrl,
		role: user.role, registeredAt: user.createdAt, lastUpdatedAt: user.updatedAt,
	  },
	  artworks: user.artworks,
	  comments: user.comments,
	  likes: user.likes,
	  // Relations Prisma nommées à l'envers (§1bis) : on rétablit le sens.
	  following: user.followers,
	  followers: user.following,
	  counts: {
		artworks: user.artworks.length,
		comments: user.comments.length,
		likes: user.likes.length,
		following: user.followers.length,
		followers: user.following.length,
	  },
	};
  }

// get user connected and check if he can delete the user
  async removeById(id: string, loggedUserId?: string) {
	const target = await this.prisma.user.findUnique({where: {id}})
	if (!target) {
	  throw new NotFoundException('User not found');
	}
	// D2 : l'autorisation dépend du rôle de L'APPELANT, pas de la cible.
	const actor = await this.prisma.user.findUnique({
		where: { id: loggedUserId },
		select: { id: true, role: true },
	});
	if (!actor) throw new ForbiddenException('Unknown actor');
	if (id !== actor.id && actor.role !== Role.ADMIN) {
		throw new ForbiddenException('You are not authorized to delete this user');
	}
	// Garde-fou : ne pas supprimer le dernier administrateur.
	if (target.role === Role.ADMIN) {
		const adminCount = await this.prisma.user.count({ where: { role: Role.ADMIN } });
		if (adminCount <= 1) {
			throw new ForbiddenException('Cannot delete the last administrator');
		}
	}
	// Mémoriser avant suppression : après, la ligne n'existe plus.
	const { email, username } = target;
	if (target.avatarPublicId && target.avatarPublicId !== process.env.DEFAULT_AVATAR_PUBLIC_ID	) {
		try {
		await this.cloudinaryService.deleteImage(target.avatarPublicId);
		}
		catch (error) {
			console.error('Error deleting user avatar', error);
		}
	}
	const artworks = await this.prisma.artwork.findMany({where: {authorId: id}});
	for (const artwork of artworks) {
		if (artwork.mediaPublicId) {
			try {
				await this.cloudinaryService.deleteImage(artwork.mediaPublicId);
			} catch (error) {
				throw new BadRequestException(`Failed to delete artwork image with publicId: ${artwork.mediaPublicId}`);
			}
		}
}
	await this.prisma.user.delete({
		where: { id },
	});
	await this.prisma.tag.deleteMany({
		where: {
			artworks: {
				none: {},
			},
		},
	});
	// E-mail de confirmation après succès (best-effort).
	await this.mailService.sendAccountDeleted(email, username);
	return { message: 'User deleted successfully' };
}

async updateRoles(id: string, role: Role, actorId: string) {
	const target = await this.prisma.user.findUnique({ where: { id } });
	if (!target) {
		throw new NotFoundException('User not found');
	}
	// Un admin ne peut pas se rétrograder lui-même : il perdrait l'accès à la
	// gestion des rôles, potentiellement sans recours.
	if (id === actorId && role !== Role.ADMIN) {
		throw new ForbiddenException('You cannot demote yourself');
	}
	// Ne pas laisser l'instance sans administrateur.
	if (target.role === Role.ADMIN && role !== Role.ADMIN) {
		const adminCount = await this.prisma.user.count({ where: { role: Role.ADMIN } });
		if (adminCount <= 1) {
			throw new ForbiddenException('Cannot demote the last administrator');
		}
	}
	return this.prisma.user.update({
		where: { id },
		data: { role },
		select: { id: true, username: true, role: true },
	});
}
}
