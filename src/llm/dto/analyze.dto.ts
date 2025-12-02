import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class AnalyzeDto {
  @IsString()
  @IsNotEmpty({ message: 'La consulta es obligatoria' })
  query: string;

  @IsNumber()
  @IsOptional()
  maxResults?: number;
}

