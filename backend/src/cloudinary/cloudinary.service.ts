import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { UploadApiResponse, v2 } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    v2.config({
      cloud_name: this.configService.getOrThrow('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.getOrThrow('CLOUDINARY_API_KEY'),
      api_secret: this.configService.getOrThrow('CLOUDINARY_API_SECRET'),
    });
  }

  async upload(file: Express.Multer.File): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      v2.uploader
        .upload_stream(
          { folder: 'uploads', resource_type: 'auto' },
          (error, result) => {
            if (error) return reject(error);
            if (result) return resolve(result);
            return reject(new Error('Cloudinary upload failed: no result'));
          },
        )
        .end(file.buffer);
    });
  }

  // Copy a remote image into Cloudinary and serve it from our own CDN. Used for
  // Google OAuth avatars: lh3.googleusercontent.com sends no
  // Access-Control-Allow-Origin and rate-limits hotlinking (429), so handing
  // that URL to the browser is what made avatars disappear. The SDK fetches the
  // URL server-side, so nothing cross-origin reaches the client.
  // Returns null on failure — a missing avatar must never block a sign-in.
  async uploadRemote(
    url: string,
    folder = 'avatars',
  ): Promise<UploadApiResponse | null> {
    try {
      return await v2.uploader.upload(url, { folder, resource_type: 'image' });
    } catch (error) {
      console.error('Cloudinary remote upload failed:', error);
      return null;
    }
  }

  async deleteImage(
    publicId: string,
    resource_type: string = 'image',
  ): Promise<UploadApiResponse> {
    try {
      return await v2.uploader.destroy(publicId, { resource_type });
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      throw error;
    }
  }
}
