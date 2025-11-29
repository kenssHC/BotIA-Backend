import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'La instrucción es obligatoria' })
  instruction: string;

  @IsString()
  @IsNotEmpty({ message: 'La frecuencia es obligatoria' })
  frequency: string; // 'daily' | 'weekly' | 'monthly'

  @IsObject()
  @IsOptional()
  frequencyDetails?: any;

  @IsString()
  @IsNotEmpty({ message: 'La hora es obligatoria' })
  time: string; // "09:00"

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

