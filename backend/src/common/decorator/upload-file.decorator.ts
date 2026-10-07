import {
  applyDecorators,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  FileInterceptor,
  FilesInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { Request } from 'express';
import { memoryStorage } from 'multer';

/* -------------------------
   Shared Multer Config
-------------------------- */

const storage = memoryStorage();

const limits = {
  fileSize: 10 * 1024 * 1024, // 10MB
};

/* -------------------------
   File Type Enum
-------------------------- */

export enum AllowedFileType {
  IMAGE = 'image',
  VIDEO = 'video',
  PDF = 'pdf',
  DOC = 'doc',
  AUDIO = 'audio',
  ANY = 'any',
}

/* -------------------------
   MIME Type Mapping (SECURE)
-------------------------- */

const MIME_TYPE_MAP: Record<AllowedFileType, RegExp> = {
  [AllowedFileType.IMAGE]: /^image\//,
  [AllowedFileType.VIDEO]: /^video\//,
  [AllowedFileType.PDF]: /^application\/pdf$/,
  [AllowedFileType.DOC]:
    /^(application\/msword|application\/vnd.openxmlformats-officedocument)/,
  [AllowedFileType.AUDIO]: /^audio\//,
  [AllowedFileType.ANY]: /.*/,
};

/* -------------------------
   File Validation Helper
-------------------------- */

const validateFile = (
  file: Express.Multer.File,
  type: AllowedFileType = AllowedFileType.ANY,
) => {
  if (type === AllowedFileType.ANY) return true;

  const mimeRegex = MIME_TYPE_MAP[type];
  return mimeRegex.test(file.mimetype);
};

/* -------------------------
   1. Single File Upload
-------------------------- */

export const UploadSingleFile = (
  fieldName = 'file',
  type: AllowedFileType = AllowedFileType.ANY,
) =>
  applyDecorators(
    UseInterceptors(
      FileInterceptor(fieldName, {
        storage,
        fileFilter: (
          _req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, acceptFile: boolean) => void,
        ) => {
          if (!validateFile(file, type)) {
            return cb(
              new BadRequestException(`Invalid file type. Allowed: ${type}`),
              false,
            );
          }
          cb(null, true);
        },
        limits,
      }),
    ),

    ApiConsumes('multipart/form-data'),
  );

/* -------------------------
   2. Multiple Files (same field)
-------------------------- */

export const UploadMultipleFiles = (
  fieldName = 'files',
  maxCount = 10,
  type: AllowedFileType = AllowedFileType.ANY,
) =>
  applyDecorators(
    UseInterceptors(
      FilesInterceptor(fieldName, Math.min(maxCount, 20), {
        storage,
        fileFilter: (
          _req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, acceptFile: boolean) => void,
        ) => {
          if (!validateFile(file, type)) {
            return cb(
              new BadRequestException(`Invalid file type. Allowed: ${type}`),
              false,
            );
          }
          cb(null, true);
        },
        limits,
      }),
    ),

    ApiConsumes('multipart/form-data'),
  );

/* -------------------------
   3. Mixed File Fields
-------------------------- */

export type FileFieldConfig = {
  name: string;
  maxCount?: number;
  type?: AllowedFileType;
};

export const UploadFileFields = (fields: FileFieldConfig[]) =>
  applyDecorators(
    UseInterceptors(
      FileFieldsInterceptor(
        fields.map((f) => ({
          name: f.name,
          maxCount: Math.min(f.maxCount ?? 1, 20),
        })),
        {
          storage,
          fileFilter: (
            _req: Request,
            file: Express.Multer.File,
            cb: (error: Error | null, acceptFile: boolean) => void,
          ) => {
            const config = fields.find((f) => f.name === file.fieldname);

            if (!config) {
              return cb(
                new BadRequestException(`Unexpected field: ${file.fieldname}`),
                false,
              );
            }

            if (!validateFile(file, config.type)) {
              return cb(
                new BadRequestException(
                  `Invalid file type for ${file.fieldname}. Allowed: ${config.type}`,
                ),
                false,
              );
            }

            cb(null, true);
          },
          limits,
        },
      ),
    ),

    ApiConsumes('multipart/form-data'),
  );
