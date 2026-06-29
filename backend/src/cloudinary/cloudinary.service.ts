import { Global, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config/dist/config.service";
import { UploadApiResponse, v2 } from "cloudinary";

@Injectable()
export class CloudinaryService {

	constructor(private readonly configService: ConfigService) {
		

		v2.config({
			cloud_name: this.configService.getOrThrow('CLOUDINARY_CLOUD_NAME'),
			api_key: this.configService.getOrThrow('CLOUDINARY_API_KEY'),
			api_secret: this.configService.getOrThrow('CLOUDINARY_API_SECRET'),
		});
	}


  async uploadImage(file: Express.Multer.File): Promise<UploadApiResponse> {
	return new Promise((resolve, reject) => {
	  v2.uploader.upload_stream(
		{ folder: "uploads" },
		(error, result) => {
		  if (error) {
			reject(error);
		  } else if (result) {
			resolve(result);
		  } else {
			reject(new Error("Upload failed: no result returned"));
		  }
		}
	  ).end(file.buffer);
	});
  }

  async deleteImage(publicId: string ): Promise<UploadApiResponse> {
	return new Promise((resolve, reject) => {
	  v2.uploader.destroy(publicId, (error, result) => {
		if (error) {
		  reject(error);
		} else if (result) {
		  resolve(result);
		} else {
		  reject(new Error("Delete failed: no result returned"));
		}
	  });
	});
  }

}