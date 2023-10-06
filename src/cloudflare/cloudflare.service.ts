import { Injectable } from '@nestjs/common';
import { v4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AcademyService } from 'src/academy/academy.service';

const accountid = '1bb1bad530f7fe11d1ad7016ef1eb9af';
const access_key_id = '3cc93c070860661210fb141a7aaa5099';
const access_key_secret =
  '44622f57c7f504e312ba8ff4f30330fc296c0078a093fadb72b3922680d67d5b';

@Injectable()
export class CloudflareService {
  s3: S3Client;

  constructor(private readonly academyService: AcademyService) {
    this.s3 = new S3Client({
      endpoint: `https://${accountid}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: `${access_key_id}`,
        secretAccessKey: `${access_key_secret}`,
      },
      region: 'auto',
    });
  }

  async getUploadVideoUrl(courseId: string, path: string) {
    const uuid = v4();
    const filename = uuid + '.mp4';

    const course = await this.academyService.getCourseById(courseId);

    return {
      filename,
      url: await getSignedUrl(
        this.s3,
        new PutObjectCommand({
          Bucket: 'academia-top',
          Key: `${course.s3_path}/${path}/${filename}`,
        }),
        { expiresIn: 3600 },
      ),
    };
  }
}
