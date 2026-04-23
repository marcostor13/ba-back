import { IsString, IsMongoId, MinLength, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsMongoId()
  projectId: string;

  @IsString()
  @MinLength(1, { message: 'Comment text is required' })
  @MaxLength(2000, { message: 'Comment must not exceed 2000 characters' })
  text: string;
}
