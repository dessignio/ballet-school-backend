import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './student.entity';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
// Aquí importaremos StudentService y StudentController más adelante

@Module({
  imports: [TypeOrmModule.forFeature([Student])],
  providers: [StudentService],
  controllers: [StudentController], // Esto hace que StudentRepository esté disponible
  // controllers: [StudentController], // Descomentaremos esto después
  // providers: [StudentService],      // Descomentaremos esto después
})
export class StudentModule {}
