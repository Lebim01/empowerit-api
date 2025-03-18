import { IsString } from 'class-validator';

export class GetUserRankDTO {
  @IsString()
  id_user: string;
}
