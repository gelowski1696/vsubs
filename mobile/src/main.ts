import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage-angular';
import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes';
import { AuthInterceptor } from './app/core/auth/auth.interceptor';
import { RefreshInterceptor } from './app/core/auth/refresh.interceptor';
import { ClientIdInterceptor } from './app/core/tenant/client-id.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes),
    provideHttpClient(withInterceptorsFromDi()),
    importProvidersFrom(IonicModule.forRoot(), IonicStorageModule.forRoot()),
    ModalController,
    ToastController,
    { provide: HTTP_INTERCEPTORS, useClass: ClientIdInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: RefreshInterceptor, multi: true },
  ],
}).catch((err) => console.error(err));
