export enum IS3ObjectType {
  PRODUCT = 'product',
  USER = 'user',
}

export enum MimeTypes {
  IMAGE_JPEG = 'image/jpeg',
  IMAGE_PNG = 'image/png',
  IMAGE_GIF = 'image/gif',
  IMAGE_WEBP = 'image/webp',
  IMAGE_SVG = 'image/svg+xml',
  VIDEO_MP4 = 'video/mp4',
  VIDEO_WEBM = 'video/webm',
  APPLICATION_PDF = 'application/pdf',
  APPLICATION_JSON = 'application/json',
  TEXT_PLAIN = 'text/plain',
}

export interface IAssetS3Object {
  _id?: string;
  refId: string;
  belongsTo: IS3ObjectType;
  fileName: string;
  fileSize: number;
  mimeType: MimeTypes;
  key: string;
  bucket: string;
  isPublic: boolean;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AssetS3ObjectQueryParams {
  refId?: string;
  belongsTo?: IS3ObjectType;
  mimeType?: MimeTypes;
  isPublic?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
}
