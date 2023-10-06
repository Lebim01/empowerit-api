import { Injectable } from '@nestjs/common';
import { v4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AcademyService } from 'src/academy/academy.service';

const accountid = '1bb1bad530f7fe11d1ad7016ef1eb9af';
const access_key_id = '56c04a5b2f61d9b53090cec8d0fd773e';
const access_key_secret =
  '2db374a6bd1577ddf2bfed8236d464fdb0d0ed84698481d8e00a5c93086a7701';

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
      apiVersion: 'v4',
    });
  }

  async getUploadVideoUrl(courseId: string, path: string) {
    const uuid = v4();
    const filename = uuid + '.mp4';

    const course = await this.academyService.getCourseById(courseId);

    if (course) {
      console.log(course);

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
    } else {
      throw new Error('Curso no existe');
    }
  }
}
