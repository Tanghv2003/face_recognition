import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FaceRecognitionModule } from './face-recognition/face-recognition.module';

@Module({
  imports: [FaceRecognitionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
