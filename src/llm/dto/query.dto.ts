import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class QueryDto {
  @IsString()
  @IsNotEmpty({ message: 'La consulta es obligatoria' })
  query: string;

  @IsNumber()
  @IsOptional()
  maxResults?: number = 100;
}

