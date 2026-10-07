// import { Body, Controller, Get, Param, Post } from '@nestjs/common';
// import { S3UploadService } from './s3-upload.service';
// import { UploadFileDto } from './dto/upload-file.dto';
// import { ApiParam } from '@nestjs/swagger';

// @Controller('upload-file')
// export class UploadFileController {
//   constructor(private readonly s3UploadService: S3UploadService) {}

//   @Post('/single')
//   async upload(@Body() payload: UploadFileDto) {
//     return this.s3UploadService.createSingleUploadUrl(payload);
//   }

//   @Get('/url/:key')
//   @ApiParam({
//     name: 'key',
//   })
//   async getDownloadUrl(@Param('key') key: string) {
//     return this.s3UploadService.getDownloadUrl(key);
//   }
// }
